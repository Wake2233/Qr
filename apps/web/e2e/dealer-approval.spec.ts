import {
  addVehicleImages,
  createPhotoUpload,
  createVehicle,
  listModels,
  setVehicleStatus,
  uploadPhoto,
  type AppSupabaseClient,
} from '@cp/api';
import { parseDbError } from '@cp/core';
import { vehicleUpsertSchema } from '@cp/validators';
import { expect, test } from '@playwright/test';

import { anonApi, apiAs, readOtp, signIn } from './support';

/** A one-page PDF is enough for the private dealer-docs bucket. */
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/** Signs a brand-new account in through supabase-js with the emailed code. */
async function apiWithOtp(email: string): Promise<AppSupabaseClient> {
  const client = anonApi();
  const since = new Date(Date.now() - 2000);
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
  const { error: verifyError } = await client.auth.verifyOtp({
    email,
    token: await readOtp(email, since),
    type: 'email',
  });
  if (verifyError) throw verifyError;
  return client;
}

test.describe('dealer onboarding', () => {
  const stamp = Date.now().toString(36);
  const email = `e2e-dealer-${stamp}@test.local`;
  const dealerName = `E2E Motors ${stamp}`;
  let dealerId: string | undefined;

  test.afterAll(async () => {
    if (!dealerId) return;
    const admin = await apiAs('admin@test.local');
    const [photos, docs] = await Promise.all([
      admin.storage.from('vehicle-images').list(dealerId),
      admin.storage.from('dealer-docs').list(dealerId),
    ]);
    for (const folder of photos.data ?? []) {
      const files = await admin.storage.from('vehicle-images').list(`${dealerId}/${folder.name}`);
      await admin.storage
        .from('vehicle-images')
        .remove((files.data ?? []).map((f) => `${dealerId}/${folder.name}/${f.name}`));
    }
    await admin.storage
      .from('dealer-docs')
      .remove((docs.data ?? []).map((f) => `${dealerId}/${f.name}`));
    await admin.from('dealers').delete().eq('id', dealerId);
  });

  test('apply → admin approves → dealer can publish', async ({ page, browser }) => {
    // 1. A new user applies on /sell-with-us (with a supporting document).
    await signIn(page, email, '/sell-with-us');
    await page.getByLabel('Dealership name').fill(dealerName);
    await page.getByLabel('Phone', { exact: true }).fill('(908) 555-0177');
    await page.getByLabel('WhatsApp number').fill('(908) 555-0177');
    await expect(page.getByLabel('Business email')).toHaveValue(email);
    await page.getByLabel('Street address').fill('1 Main St');
    await page.getByLabel('City').fill('Flemington');
    await page.getByLabel('State').fill('NJ');
    await page.getByLabel('ZIP code').fill('08822');
    await page.getByLabel('Dealer license number').fill(`NJ-E2E-${stamp}`);
    await page.locator('input[type=file]').setInputFiles({
      name: 'dealer-license.pdf',
      mimeType: 'application/pdf',
      buffer: PDF,
    });
    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByRole('heading', { name: 'Application received' })).toBeVisible();

    // 2. Pending dealers can prepare drafts, but the publish gate refuses them.
    const applicant = await apiWithOtp(email);
    const { data: membership } = await applicant
      .from('dealer_members')
      .select('dealer_id')
      .single();
    dealerId = membership?.dealer_id;
    expect(dealerId).toBeTruthy();
    const { data: user } = await applicant.auth.getUser();
    const [model] = await listModels(applicant);
    const draft = await createVehicle(
      applicant,
      vehicleUpsertSchema.parse({
        dealer_id: dealerId,
        make_id: model?.make_id,
        model_id: model?.id,
        year: 2021,
        mileage: 30_000,
        price_cents: 1_999_000,
        body_type: 'sedan',
        fuel_type: 'gasoline',
        drivetrain: 'fwd',
        transmission: 'automatic',
        exterior_color: 'Blue',
      }),
      user.user?.id ?? '',
    );
    const target = await createPhotoUpload(applicant, {
      dealerId: dealerId ?? '',
      vehicleId: draft.id,
      fileId: crypto.randomUUID(),
    });
    await uploadPhoto(applicant, target, new Blob([PIXEL]), 'image/webp');
    await addVehicleImages(applicant, draft.id, [{ storage_path: target.path }]);
    const blocked = await setVehicleStatus(applicant, draft.id, 'active').catch(
      (error: unknown) => error,
    );
    expect(parseDbError(blocked).code).toBe('DEALER_NOT_APPROVED');

    // 3. An admin reviews the application (document link included) and approves it.
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await signIn(adminPage, 'admin@test.local', '/dashboard/dealers');
    await adminPage.goto('/dashboard/dealers?status=pending');
    await adminPage.getByRole('link', { name: dealerName }).click();
    await expect(adminPage.getByRole('heading', { name: dealerName })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: 'dealer-license.pdf' })).toHaveAttribute(
      'href',
      /\/storage\/v1\/object\/sign\/dealer-docs\//,
    );
    await adminPage.getByRole('button', { name: 'Approve' }).click();
    await expect(adminPage.getByText(`${dealerName} approved`)).toBeVisible();
    await adminContext.close();

    // 4. The dealer can now publish, and buyers see the listing.
    expect(await setVehicleStatus(applicant, draft.id, 'active')).toBe('active');
    const { data: card } = await anonApi()
      .from('vehicle_cards')
      .select('status, dealer_name')
      .eq('id', draft.id)
      .single();
    expect(card).toEqual({ status: 'active', dealer_name: dealerName });

    // The applicant's account now has console access.
    await page.goto('/sell-with-us');
    await expect(page.getByText('Your dealership is approved')).toBeVisible();
  });
});
