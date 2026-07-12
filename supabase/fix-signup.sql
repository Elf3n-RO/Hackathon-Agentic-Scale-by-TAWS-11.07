-- Fix registro de usuarios (ejecutar en Supabase SQL Editor si el signup falla)

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_val user_role := 'cliente';
BEGIN
  IF NEW.raw_user_meta_data->>'role' IN ('cliente', 'ejecutivo', 'admin') THEN
    user_role_val := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    user_role_val
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP POLICY IF EXISTS "Usuarios crean su perfil" ON profiles;
CREATE POLICY "Usuarios crean su perfil" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
