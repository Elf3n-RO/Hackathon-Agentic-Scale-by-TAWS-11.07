-- SyntaxError Track1 - Supabase Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- Tipos
CREATE TYPE user_role AS ENUM ('cliente', 'ejecutivo', 'admin');
CREATE TYPE chat_tipo AS ENUM ('comercial', 'tutor');
CREATE TYPE mensaje_rol AS ENUM ('usuario', 'asistente');
CREATE TYPE lead_tipo AS ENUM ('B2B', 'B2C');
CREATE TYPE accion_estado AS ENUM ('pendiente', 'aprobada', 'editada', 'rechazada');

-- Perfiles (extiende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'cliente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversaciones
CREATE TABLE IF NOT EXISTS conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT 'Nueva conversación',
  tipo chat_tipo NOT NULL DEFAULT 'comercial',
  estado TEXT NOT NULL DEFAULT 'activa',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mensajes
CREATE TABLE IF NOT EXISTS mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id UUID NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
  rol mensaje_rol NOT NULL,
  contenido TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads CRM
CREATE TABLE IF NOT EXISTS leads_crm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversacion_id UUID REFERENCES conversaciones(id) ON DELETE SET NULL,
  tipo lead_tipo,
  interes TEXT DEFAULT '',
  presupuesto TEXT DEFAULT '',
  urgencia TEXT DEFAULT '',
  prioridad INTEGER DEFAULT 0 CHECK (prioridad >= 0 AND prioridad <= 100),
  resumen TEXT DEFAULT '',
  objeciones TEXT DEFAULT '',
  etapa TEXT DEFAULT 'nuevo',
  siguiente_accion TEXT DEFAULT '',
  consentimiento BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evaluaciones quiz tutor
CREATE TABLE IF NOT EXISTS evaluaciones_quiz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversacion_id UUID REFERENCES conversaciones(id) ON DELETE SET NULL,
  tema TEXT NOT NULL DEFAULT '',
  respuestas JSONB DEFAULT '[]',
  resultado TEXT DEFAULT '',
  puntaje INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Acciones comerciales (aprobación ejecutivo)
CREATE TABLE IF NOT EXISTS acciones_comerciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads_crm(id) ON DELETE CASCADE,
  propuesta TEXT NOT NULL,
  estado accion_estado NOT NULL DEFAULT 'pendiente',
  ejecutivo_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notas TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: crear perfil al registrarse
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER conversaciones_updated_at BEFORE UPDATE ON conversaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER leads_crm_updated_at BEFORE UPDATE ON leads_crm
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER acciones_comerciales_updated_at BEFORE UPDATE ON acciones_comerciales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones_quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE acciones_comerciales ENABLE ROW LEVEL SECURITY;

-- Helper: rol del usuario actual
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Usuarios ven su perfil" ON profiles
  FOR SELECT USING (id = auth.uid() OR get_my_role() IN ('ejecutivo', 'admin'));
CREATE POLICY "Usuarios editan su perfil" ON profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Usuarios crean su perfil" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Admin gestiona perfiles" ON profiles
  FOR ALL USING (get_my_role() = 'admin');

-- Conversaciones policies
CREATE POLICY "Usuarios ven sus conversaciones" ON conversaciones
  FOR SELECT USING (user_id = auth.uid() OR get_my_role() IN ('ejecutivo', 'admin'));
CREATE POLICY "Usuarios crean conversaciones" ON conversaciones
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Usuarios editan sus conversaciones" ON conversaciones
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Usuarios eliminan sus conversaciones" ON conversaciones
  FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Admin edita conversaciones" ON conversaciones
  FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "Admin elimina conversaciones" ON conversaciones
  FOR DELETE USING (get_my_role() = 'admin');

-- Mensajes policies
CREATE POLICY "Ver mensajes de conversaciones propias" ON mensajes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversaciones c
      WHERE c.id = mensajes.conversacion_id
      AND (c.user_id = auth.uid() OR get_my_role() IN ('ejecutivo', 'admin'))
    )
  );
CREATE POLICY "Insertar mensajes en conversaciones propias" ON mensajes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversaciones c
      WHERE c.id = mensajes.conversacion_id AND c.user_id = auth.uid()
    )
  );

-- Leads CRM policies
CREATE POLICY "Ver leads propios o como ejecutivo" ON leads_crm
  FOR SELECT USING (user_id = auth.uid() OR get_my_role() IN ('ejecutivo', 'admin'));
CREATE POLICY "Crear leads propios" ON leads_crm
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Actualizar leads" ON leads_crm
  FOR UPDATE USING (user_id = auth.uid() OR get_my_role() IN ('ejecutivo', 'admin'));

-- Evaluaciones policies
CREATE POLICY "Ver evaluaciones propias" ON evaluaciones_quiz
  FOR SELECT USING (user_id = auth.uid() OR get_my_role() IN ('ejecutivo', 'admin'));
CREATE POLICY "Crear evaluaciones propias" ON evaluaciones_quiz
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Acciones comerciales policies
CREATE POLICY "Ver acciones comerciales" ON acciones_comerciales
  FOR SELECT USING (get_my_role() IN ('ejecutivo', 'admin'));
CREATE POLICY "Ejecutivos gestionan acciones" ON acciones_comerciales
  FOR ALL USING (get_my_role() IN ('ejecutivo', 'admin'));
CREATE POLICY "Clientes ven acciones de sus leads" ON acciones_comerciales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads_crm l
      WHERE l.id = acciones_comerciales.lead_id AND l.user_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_conversaciones_user ON conversaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON mensajes(conversacion_id);
CREATE INDEX IF NOT EXISTS idx_leads_user ON leads_crm(user_id);
CREATE INDEX IF NOT EXISTS idx_acciones_lead ON acciones_comerciales(lead_id);
