/**
 * @fileoverview Environment variable type definitions
 * 
 * @description TypeScript declarations for environment variables used in the application.
 * Ensures type safety for process.env access.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    /** Airlabs API key for flight data enrichment */
    AIRLABS_API_KEY: string;
    
    /** Supabase URL */
    NEXT_PUBLIC_SUPABASE_URL: string;
    
    /** Supabase anonymous key */
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    
    /** Supabase service role key (server-only) */
    SUPABASE_SERVICE_ROLE_KEY: string;
    
    /** AviationStack API key (backup flight data provider) */
    AVIATIONSTACK_API_KEY?: string;
    
    /** Next.js environment */
    NODE_ENV: 'development' | 'production' | 'test';
    
    /** Next.js runtime URL */
    VERCEL_URL?: string;
    
    /** Deployment environment */
    VERCEL_ENV?: 'development' | 'preview' | 'production';
  }
}
