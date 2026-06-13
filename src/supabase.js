import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://fwaqitobppswbdnmquvo.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3YXFpdG9icHBzd2Jkbm1xdXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzYzNzAsImV4cCI6MjA5NjgxMjM3MH0.-4sKy-3SqEPIp62GARwc96UBKmiIyS3XeAv35ZpeMj0"

export const supabase =
  createClient(
    supabaseUrl,
    supabaseKey
  )