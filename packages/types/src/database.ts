
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"diff": NonNullable<Json>,"entity": string,"entity_id": string,"id": number
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"diff"?: NonNullable<Json>,"entity": string,"entity_id": string,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"diff"?: NonNullable<Json>,"entity"?: string,"entity_id"?: string,"id"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_clicks": {
                  Row: {
                    "channel": Database["public"]['Enums']["contact_channel"],"created_at": string,"dealer_id": string,"id": number,"platform": Database["public"]['Enums']["client_platform"],"user_id": string | null,"vehicle_id": string | null
                  }
                  Insert: {
                    "channel": Database["public"]['Enums']["contact_channel"],"created_at"?: string,"dealer_id": string,"id"?: never,"platform": Database["public"]['Enums']["client_platform"],"user_id"?: string | null,"vehicle_id"?: string | null
                  }
                  Update: {
                    "channel"?: Database["public"]['Enums']["contact_channel"],"created_at"?: string,"dealer_id"?: string,"id"?: never,"platform"?: Database["public"]['Enums']["client_platform"],"user_id"?: string | null,"vehicle_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contact_clicks_dealer_id_fkey"
      columns: ["dealer_id"]
isOneToOne: false
      referencedRelation: "dealers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_clicks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_clicks_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicle_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_clicks_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"dealer_members": {
                  Row: {
                    "created_at": string,"dealer_id": string,"role": Database["public"]['Enums']["dealer_member_role"],"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"dealer_id": string,"role"?: Database["public"]['Enums']["dealer_member_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"dealer_id"?: string,"role"?: Database["public"]['Enums']["dealer_member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dealer_members_dealer_id_fkey"
      columns: ["dealer_id"]
isOneToOne: false
      referencedRelation: "dealers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dealer_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"dealer_private": {
                  Row: {
                    "created_at": string,"dealer_id": string,"documents": NonNullable<Json>,"license_number": string | null,"tax_id_last4": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"dealer_id": string,"documents"?: NonNullable<Json>,"license_number"?: string | null,"tax_id_last4"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"dealer_id"?: string,"documents"?: NonNullable<Json>,"license_number"?: string | null,"tax_id_last4"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dealer_private_dealer_id_fkey"
      columns: ["dealer_id"]
isOneToOne: true
      referencedRelation: "dealers"
      referencedColumns: ["id"]
    }
                  ]
                },"dealers": {
                  Row: {
                    "address_line1": string | null,"approved_at": string | null,"approved_by": string | null,"business_hours": NonNullable<Json>,"city": string | null,"created_at": string,"created_by": string | null,"description": string | null,"display_name": string,"email": string | null,"id": string,"is_house": boolean,"lat": number | null,"legal_name": string | null,"lng": number | null,"logo_path": string | null,"phone_e164": string | null,"postal_code": string | null,"rejection_reason": string | null,"slug": string,"state": string | null,"status": Database["public"]['Enums']["dealer_status"],"updated_at": string,"website": string | null,"whatsapp_e164": string | null
                  }
                  Insert: {
                    "address_line1"?: string | null,"approved_at"?: string | null,"approved_by"?: string | null,"business_hours"?: NonNullable<Json>,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"display_name": string,"email"?: string | null,"id"?: string,"is_house"?: boolean,"lat"?: number | null,"legal_name"?: string | null,"lng"?: number | null,"logo_path"?: string | null,"phone_e164"?: string | null,"postal_code"?: string | null,"rejection_reason"?: string | null,"slug": string,"state"?: string | null,"status"?: Database["public"]['Enums']["dealer_status"],"updated_at"?: string,"website"?: string | null,"whatsapp_e164"?: string | null
                  }
                  Update: {
                    "address_line1"?: string | null,"approved_at"?: string | null,"approved_by"?: string | null,"business_hours"?: NonNullable<Json>,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"display_name"?: string,"email"?: string | null,"id"?: string,"is_house"?: boolean,"lat"?: number | null,"legal_name"?: string | null,"lng"?: number | null,"logo_path"?: string | null,"phone_e164"?: string | null,"postal_code"?: string | null,"rejection_reason"?: string | null,"slug"?: string,"state"?: string | null,"status"?: Database["public"]['Enums']["dealer_status"],"updated_at"?: string,"website"?: string | null,"whatsapp_e164"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "dealers_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dealers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"favorites": {
                  Row: {
                    "created_at": string,"user_id": string,"vehicle_id": string
                  }
                  Insert: {
                    "created_at"?: string,"user_id": string,"vehicle_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicle_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"features": {
                  Row: {
                    "category": Database["public"]['Enums']["feature_category"],"created_at": string,"icon": string | null,"id": number,"name": string,"slug": string
                  }
                  Insert: {
                    "category": Database["public"]['Enums']["feature_category"],"created_at"?: string,"icon"?: string | null,"id"?: never,"name": string,"slug": string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["feature_category"],"created_at"?: string,"icon"?: string | null,"id"?: never,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"finance_applications": {
                  Row: {
                    "access_token": string,"consent_at": string,"consent_text_version": string,"created_at": string,"credit_tier": Database["public"]['Enums']["credit_tier"],"dealer_id": string,"down_payment_cents": number,"email": string,"employment_status": string | null,"first_name": string,"housing_payment_cents": number | null,"id": string,"last_name": string,"monthly_income_cents": number | null,"phone_e164": string,"postal_code": string,"requested_amount_cents": number,"status": Database["public"]['Enums']["finance_app_status"],"term_months": number,"trade_in_value_cents": number,"updated_at": string,"user_id": string | null,"vehicle_id": string | null
                  }
                  Insert: {
                    "access_token"?: string,"consent_at": string,"consent_text_version": string,"created_at"?: string,"credit_tier": Database["public"]['Enums']["credit_tier"],"dealer_id": string,"down_payment_cents"?: number,"email": string,"employment_status"?: string | null,"first_name": string,"housing_payment_cents"?: number | null,"id"?: string,"last_name": string,"monthly_income_cents"?: number | null,"phone_e164": string,"postal_code": string,"requested_amount_cents": number,"status"?: Database["public"]['Enums']["finance_app_status"],"term_months": number,"trade_in_value_cents"?: number,"updated_at"?: string,"user_id"?: string | null,"vehicle_id"?: string | null
                  }
                  Update: {
                    "access_token"?: string,"consent_at"?: string,"consent_text_version"?: string,"created_at"?: string,"credit_tier"?: Database["public"]['Enums']["credit_tier"],"dealer_id"?: string,"down_payment_cents"?: number,"email"?: string,"employment_status"?: string | null,"first_name"?: string,"housing_payment_cents"?: number | null,"id"?: string,"last_name"?: string,"monthly_income_cents"?: number | null,"phone_e164"?: string,"postal_code"?: string,"requested_amount_cents"?: number,"status"?: Database["public"]['Enums']["finance_app_status"],"term_months"?: number,"trade_in_value_cents"?: number,"updated_at"?: string,"user_id"?: string | null,"vehicle_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "finance_applications_dealer_id_fkey"
      columns: ["dealer_id"]
isOneToOne: false
      referencedRelation: "dealers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finance_applications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finance_applications_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicle_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finance_applications_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"lead_activities": {
                  Row: {
                    "author_id": string | null,"body": string | null,"created_at": string,"id": string,"kind": string,"lead_id": string,"meta": NonNullable<Json>
                  }
                  Insert: {
                    "author_id"?: string | null,"body"?: string | null,"created_at"?: string,"id"?: string,"kind": string,"lead_id": string,"meta"?: NonNullable<Json>
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"lead_id"?: string,"meta"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_activities_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lead_activities_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    }
                  ]
                },"leads": {
                  Row: {
                    "assigned_to": string | null,"created_at": string,"dealer_id": string,"email": string | null,"first_response_at": string | null,"id": string,"message": string | null,"name": string,"payload": NonNullable<Json>,"phone_e164": string | null,"preferred_contact": string | null,"source": Database["public"]['Enums']["client_platform"],"status": Database["public"]['Enums']["lead_status"],"type": Database["public"]['Enums']["lead_type"],"updated_at": string,"user_id": string | null,"utm": Json | null,"vehicle_id": string | null
                  }
                  Insert: {
                    "assigned_to"?: string | null,"created_at"?: string,"dealer_id": string,"email"?: string | null,"first_response_at"?: string | null,"id"?: string,"message"?: string | null,"name": string,"payload"?: NonNullable<Json>,"phone_e164"?: string | null,"preferred_contact"?: string | null,"source"?: Database["public"]['Enums']["client_platform"],"status"?: Database["public"]['Enums']["lead_status"],"type"?: Database["public"]['Enums']["lead_type"],"updated_at"?: string,"user_id"?: string | null,"utm"?: Json | null,"vehicle_id"?: string | null
                  }
                  Update: {
                    "assigned_to"?: string | null,"created_at"?: string,"dealer_id"?: string,"email"?: string | null,"first_response_at"?: string | null,"id"?: string,"message"?: string | null,"name"?: string,"payload"?: NonNullable<Json>,"phone_e164"?: string | null,"preferred_contact"?: string | null,"source"?: Database["public"]['Enums']["client_platform"],"status"?: Database["public"]['Enums']["lead_status"],"type"?: Database["public"]['Enums']["lead_type"],"updated_at"?: string,"user_id"?: string | null,"utm"?: Json | null,"vehicle_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "leads_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_dealer_id_fkey"
      columns: ["dealer_id"]
isOneToOne: false
      referencedRelation: "dealers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicle_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"lender_offers": {
                  Row: {
                    "application_id": string,"approved_amount_cents": number,"apr_bps": number,"created_at": string,"expires_at": string,"id": string,"lender_id": string,"monthly_payment_cents": number,"term_months": number
                  }
                  Insert: {
                    "application_id": string,"approved_amount_cents": number,"apr_bps": number,"created_at"?: string,"expires_at": string,"id"?: string,"lender_id": string,"monthly_payment_cents": number,"term_months": number
                  }
                  Update: {
                    "application_id"?: string,"approved_amount_cents"?: number,"apr_bps"?: number,"created_at"?: string,"expires_at"?: string,"id"?: string,"lender_id"?: string,"monthly_payment_cents"?: number,"term_months"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lender_offers_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "finance_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lender_offers_lender_id_fkey"
      columns: ["lender_id"]
isOneToOne: false
      referencedRelation: "lenders"
      referencedColumns: ["id"]
    }
                  ]
                },"lenders": {
                  Row: {
                    "active": boolean,"base_apr_bps": number,"created_at": string,"id": string,"logo_path": string | null,"max_ltv_pct": number,"max_term_months": number,"min_credit_tier": Database["public"]['Enums']["credit_tier"],"name": string
                  }
                  Insert: {
                    "active"?: boolean,"base_apr_bps": number,"created_at"?: string,"id"?: string,"logo_path"?: string | null,"max_ltv_pct"?: number,"max_term_months"?: number,"min_credit_tier"?: Database["public"]['Enums']["credit_tier"],"name": string
                  }
                  Update: {
                    "active"?: boolean,"base_apr_bps"?: number,"created_at"?: string,"id"?: string,"logo_path"?: string | null,"max_ltv_pct"?: number,"max_term_months"?: number,"min_credit_tier"?: Database["public"]['Enums']["credit_tier"],"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"makes": {
                  Row: {
                    "created_at": string,"id": number,"logo_path": string | null,"name": string,"slug": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: never,"logo_path"?: string | null,"name": string,"slug": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"logo_path"?: string | null,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"models": {
                  Row: {
                    "created_at": string,"default_body_type": Database["public"]['Enums']["body_type"] | null,"id": number,"make_id": number,"name": string,"slug": string
                  }
                  Insert: {
                    "created_at"?: string,"default_body_type"?: Database["public"]['Enums']["body_type"] | null,"id"?: never,"make_id": number,"name": string,"slug": string
                  }
                  Update: {
                    "created_at"?: string,"default_body_type"?: Database["public"]['Enums']["body_type"] | null,"id"?: never,"make_id"?: number,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "models_make_id_fkey"
      columns: ["make_id"]
isOneToOne: false
      referencedRelation: "makes"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"full_name": string | null,"id": string,"phone": string | null,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string | null,"id": string,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string | null,"id"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_tokens": {
                  Row: {
                    "created_at": string,"id": string,"platform": Database["public"]['Enums']["client_platform"],"token": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"platform": Database["public"]['Enums']["client_platform"],"token": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"platform"?: Database["public"]['Enums']["client_platform"],"token"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"site_settings": {
                  Row: {
                    "apr_by_tier": NonNullable<Json>,"brand_name": string,"business_hours": NonNullable<Json>,"default_phone_e164": string | null,"default_whatsapp_e164": string | null,"id": number,"lender_network_size": number,"require_listing_review": boolean,"updated_at": string,"whatsapp_template": string
                  }
                  Insert: {
                    "apr_by_tier"?: NonNullable<Json>,"brand_name"?: string,"business_hours"?: NonNullable<Json>,"default_phone_e164"?: string | null,"default_whatsapp_e164"?: string | null,"id"?: number,"lender_network_size"?: number,"require_listing_review"?: boolean,"updated_at"?: string,"whatsapp_template"?: string
                  }
                  Update: {
                    "apr_by_tier"?: NonNullable<Json>,"brand_name"?: string,"business_hours"?: NonNullable<Json>,"default_phone_e164"?: string | null,"default_whatsapp_e164"?: string | null,"id"?: number,"lender_network_size"?: number,"require_listing_review"?: boolean,"updated_at"?: string,"whatsapp_template"?: string
                  }
                  Relationships: [
                    
                  ]
                },"vehicle_features": {
                  Row: {
                    "feature_id": number,"vehicle_id": string
                  }
                  Insert: {
                    "feature_id": number,"vehicle_id": string
                  }
                  Update: {
                    "feature_id"?: number,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicle_features_feature_id_fkey"
      columns: ["feature_id"]
isOneToOne: false
      referencedRelation: "features"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicle_features_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicle_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicle_features_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicle_images": {
                  Row: {
                    "alt": string | null,"blurhash": string | null,"created_at": string,"height": number | null,"id": string,"position": number,"storage_path": string,"vehicle_id": string,"width": number | null
                  }
                  Insert: {
                    "alt"?: string | null,"blurhash"?: string | null,"created_at"?: string,"height"?: number | null,"id"?: string,"position": number,"storage_path": string,"vehicle_id": string,"width"?: number | null
                  }
                  Update: {
                    "alt"?: string | null,"blurhash"?: string | null,"created_at"?: string,"height"?: number | null,"id"?: string,"position"?: number,"storage_path"?: string,"vehicle_id"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicle_images_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicle_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicle_images_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicle_price_history": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"id": number,"new_price_cents": number | null,"old_price_cents": number | null,"vehicle_id": string
                  }
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: never,"new_price_cents"?: number | null,"old_price_cents"?: number | null,"vehicle_id": string
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: never,"new_price_cents"?: number | null,"old_price_cents"?: number | null,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicle_price_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicle_price_history_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicle_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicle_price_history_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicle_views": {
                  Row: {
                    "day": string,"vehicle_id": string,"views": number
                  }
                  Insert: {
                    "day"?: string,"vehicle_id": string,"views"?: number
                  }
                  Update: {
                    "day"?: string,"vehicle_id"?: string,"views"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicle_views_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicle_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicle_views_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicles": {
                  Row: {
                    "accident_free": boolean | null,"body_type": Database["public"]['Enums']["body_type"] | null,"condition": Database["public"]['Enums']["vehicle_condition"],"created_at": string,"created_by": string | null,"cylinders": number | null,"dealer_id": string,"description": string | null,"displacement_l": number | null,"doors": number | null,"drivetrain": Database["public"]['Enums']["drivetrain"] | null,"engine": string | null,"ev_range_mi": number | null,"exterior_color": string | null,"fuel_type": Database["public"]['Enums']["fuel_type"] | null,"horsepower": number | null,"id": string,"interior_color": string | null,"is_featured": boolean,"make_id": number,"mileage": number | null,"model_id": number,"mpg_city": number | null,"mpg_highway": number | null,"msrp_cents": number | null,"owners_count": number | null,"price_cents": number | null,"published_at": string | null,"search_vector": unknown,"seats": number | null,"slug": string | null,"sold_at": string | null,"specs": NonNullable<Json>,"status": Database["public"]['Enums']["listing_status"],"stock_number": string | null,"title_status": Database["public"]['Enums']["title_status"],"torque_lbft": number | null,"transmission": Database["public"]['Enums']["transmission"] | null,"trim": string | null,"updated_at": string,"vin": string | null,"year": number
                  }
                  Insert: {
                    "accident_free"?: boolean | null,"body_type"?: Database["public"]['Enums']["body_type"] | null,"condition"?: Database["public"]['Enums']["vehicle_condition"],"created_at"?: string,"created_by"?: string | null,"cylinders"?: number | null,"dealer_id": string,"description"?: string | null,"displacement_l"?: number | null,"doors"?: number | null,"drivetrain"?: Database["public"]['Enums']["drivetrain"] | null,"engine"?: string | null,"ev_range_mi"?: number | null,"exterior_color"?: string | null,"fuel_type"?: Database["public"]['Enums']["fuel_type"] | null,"horsepower"?: number | null,"id"?: string,"interior_color"?: string | null,"is_featured"?: boolean,"make_id": number,"mileage"?: number | null,"model_id": number,"mpg_city"?: number | null,"mpg_highway"?: number | null,"msrp_cents"?: number | null,"owners_count"?: number | null,"price_cents"?: number | null,"published_at"?: string | null,"search_vector"?: unknown,"seats"?: number | null,"slug"?: string | null,"sold_at"?: string | null,"specs"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["listing_status"],"stock_number"?: string | null,"title_status"?: Database["public"]['Enums']["title_status"],"torque_lbft"?: number | null,"transmission"?: Database["public"]['Enums']["transmission"] | null,"trim"?: string | null,"updated_at"?: string,"vin"?: string | null,"year": number
                  }
                  Update: {
                    "accident_free"?: boolean | null,"body_type"?: Database["public"]['Enums']["body_type"] | null,"condition"?: Database["public"]['Enums']["vehicle_condition"],"created_at"?: string,"created_by"?: string | null,"cylinders"?: number | null,"dealer_id"?: string,"description"?: string | null,"displacement_l"?: number | null,"doors"?: number | null,"drivetrain"?: Database["public"]['Enums']["drivetrain"] | null,"engine"?: string | null,"ev_range_mi"?: number | null,"exterior_color"?: string | null,"fuel_type"?: Database["public"]['Enums']["fuel_type"] | null,"horsepower"?: number | null,"id"?: string,"interior_color"?: string | null,"is_featured"?: boolean,"make_id"?: number,"mileage"?: number | null,"model_id"?: number,"mpg_city"?: number | null,"mpg_highway"?: number | null,"msrp_cents"?: number | null,"owners_count"?: number | null,"price_cents"?: number | null,"published_at"?: string | null,"search_vector"?: unknown,"seats"?: number | null,"slug"?: string | null,"sold_at"?: string | null,"specs"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["listing_status"],"stock_number"?: string | null,"title_status"?: Database["public"]['Enums']["title_status"],"torque_lbft"?: number | null,"transmission"?: Database["public"]['Enums']["transmission"] | null,"trim"?: string | null,"updated_at"?: string,"vin"?: string | null,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicles_dealer_id_fkey"
      columns: ["dealer_id"]
isOneToOne: false
      referencedRelation: "dealers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicles_make_id_fkey"
      columns: ["make_id"]
isOneToOne: false
      referencedRelation: "makes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicles_model_id_fkey"
      columns: ["model_id"]
isOneToOne: false
      referencedRelation: "models"
      referencedColumns: ["id"]
    }
                  ]
                },"vin_decodes": {
                  Row: {
                    "decoded_at": string,"payload": NonNullable<Json>,"vin": string
                  }
                  Insert: {
                    "decoded_at"?: string,"payload": NonNullable<Json>,"vin": string
                  }
                  Update: {
                    "decoded_at"?: string,"payload"?: NonNullable<Json>,"vin"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "vehicle_cards": {
                  Row: {
                    "body_type": Database["public"]['Enums']["body_type"] | null,"condition": Database["public"]['Enums']["vehicle_condition"] | null,"cover_alt": string | null,"cover_blurhash": string | null,"cover_height": number | null,"cover_path": string | null,"cover_width": number | null,"created_at": string | null,"dealer_id": string | null,"dealer_is_house": boolean | null,"dealer_name": string | null,"dealer_slug": string | null,"dealer_status": Database["public"]['Enums']["dealer_status"] | null,"drivetrain": Database["public"]['Enums']["drivetrain"] | null,"ev_range_mi": number | null,"exterior_color": string | null,"feature_slugs": (string)[] | null,"fuel_type": Database["public"]['Enums']["fuel_type"] | null,"id": string | null,"image_count": number | null,"is_featured": boolean | null,"make_id": number | null,"make_name": string | null,"make_slug": string | null,"mileage": number | null,"model_id": number | null,"model_name": string | null,"model_slug": string | null,"mpg_city": number | null,"mpg_highway": number | null,"msrp_cents": number | null,"previous_price_cents": number | null,"price_cents": number | null,"price_dropped_at": string | null,"published_at": string | null,"search_vector": unknown,"seats": number | null,"slug": string | null,"sold_at": string | null,"status": Database["public"]['Enums']["listing_status"] | null,"stock_number": string | null,"transmission": Database["public"]['Enums']["transmission"] | null,"trim": string | null,"year": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicles_dealer_id_fkey"
      columns: ["dealer_id"]
isOneToOne: false
      referencedRelation: "dealers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicles_make_id_fkey"
      columns: ["make_id"]
isOneToOne: false
      referencedRelation: "makes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicles_model_id_fkey"
      columns: ["model_id"]
isOneToOne: false
      referencedRelation: "models"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "apply_as_dealer":
{ Args: { "payload": Json }; Returns: string
                           },
"approve_dealer":
{ Args: { "p_dealer_id": string }; Returns: undefined
                           },
"get_inventory_facets":
{ Args: { "p_filters"?: Json }; Returns: Json
                           },
"record_vehicle_view":
{ Args: { "p_vehicle_id": string }; Returns: undefined
                           },
"reject_dealer":
{ Args: { "p_dealer_id": string,"p_reason": string }; Returns: undefined
                           },
"reorder_vehicle_images":
{ Args: { "p_ordered_ids": (string)[],"p_vehicle_id": string }; Returns: undefined
                           },
"set_user_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"],"p_user_id": string }; Returns: undefined
                           },
"set_vehicle_status":
{ Args: { "p_status": Database["public"]['Enums']["listing_status"],"p_vehicle_id": string }; Returns: Database["public"]['Enums']["listing_status"]
                           },
"suspend_dealer":
{ Args: { "p_dealer_id": string,"p_reason"?: string }; Returns: undefined
                           },
"track_contact_click":
{ Args: { "p_channel": Database["public"]['Enums']["contact_channel"],"p_platform": Database["public"]['Enums']["client_platform"],"p_vehicle_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "buyer"|"dealer"|"admin","body_type": "sedan"|"suv"|"pickup"|"coupe"|"convertible"|"hatchback"|"wagon"|"van"|"minivan","client_platform": "web"|"ios"|"android","contact_channel": "whatsapp"|"call","credit_tier": "excellent"|"good"|"fair"|"rebuilding","dealer_member_role": "owner"|"manager"|"staff","dealer_status": "pending"|"approved"|"rejected"|"suspended","drivetrain": "fwd"|"rwd"|"awd"|"4wd","feature_category": "safety"|"comfort"|"technology"|"exterior"|"interior"|"performance","finance_app_status": "submitted"|"matching"|"offers_ready"|"in_review"|"withdrawn","fuel_type": "gasoline"|"diesel"|"hybrid"|"plug_in_hybrid"|"electric"|"flex_fuel","lead_status": "new"|"contacted"|"qualified"|"negotiating"|"won"|"lost","lead_type": "inquiry"|"test_drive"|"trade_in"|"finance","listing_status": "draft"|"pending_review"|"active"|"reserved"|"sold"|"archived","title_status": "clean"|"rebuilt"|"salvage"|"lemon"|"unknown","transmission": "automatic"|"manual"|"cvt"|"dct","vehicle_condition": "new"|"used"|"certified"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["buyer", "dealer", "admin"],"body_type": ["sedan", "suv", "pickup", "coupe", "convertible", "hatchback", "wagon", "van", "minivan"],"client_platform": ["web", "ios", "android"],"contact_channel": ["whatsapp", "call"],"credit_tier": ["excellent", "good", "fair", "rebuilding"],"dealer_member_role": ["owner", "manager", "staff"],"dealer_status": ["pending", "approved", "rejected", "suspended"],"drivetrain": ["fwd", "rwd", "awd", "4wd"],"feature_category": ["safety", "comfort", "technology", "exterior", "interior", "performance"],"finance_app_status": ["submitted", "matching", "offers_ready", "in_review", "withdrawn"],"fuel_type": ["gasoline", "diesel", "hybrid", "plug_in_hybrid", "electric", "flex_fuel"],"lead_status": ["new", "contacted", "qualified", "negotiating", "won", "lost"],"lead_type": ["inquiry", "test_drive", "trade_in", "finance"],"listing_status": ["draft", "pending_review", "active", "reserved", "sold", "archived"],"title_status": ["clean", "rebuilt", "salvage", "lemon", "unknown"],"transmission": ["automatic", "manual", "cvt", "dct"],"vehicle_condition": ["new", "used", "certified"]
          }
        }
} as const
