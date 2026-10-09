'use client';

import type { ConsoleNavItem } from '@cp/core';
import { Menu } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import { ConsoleSidebar } from './console-sidebar';

export function ConsoleMobileNav({ items }: { items: ConsoleNavItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open console menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-4">
        <SheetHeader className="px-0">
          <SheetTitle className="font-display">Console</SheetTitle>
        </SheetHeader>
        <ConsoleSidebar items={items} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
