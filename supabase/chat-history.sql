-- Historial de chats: soft-delete + retención de 10 eliminados
-- Ejecutar en Supabase SQL Editor (si aún no lo corriste)

ALTER TABLE conversaciones
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activa';

ALTER TABLE conversaciones
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Asegurar que filas viejas tengan estado
UPDATE conversaciones SET estado = 'activa' WHERE estado IS NULL OR estado = '';

-- Políticas: el dueño puede actualizar y borrar sus chats
DROP POLICY IF EXISTS "Usuarios editan sus conversaciones" ON conversaciones;
CREATE POLICY "Usuarios editan sus conversaciones" ON conversaciones
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios eliminan sus conversaciones" ON conversaciones;
CREATE POLICY "Usuarios eliminan sus conversaciones" ON conversaciones
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin edita conversaciones" ON conversaciones;
CREATE POLICY "Admin edita conversaciones" ON conversaciones
  FOR UPDATE USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admin elimina conversaciones" ON conversaciones;
CREATE POLICY "Admin elimina conversaciones" ON conversaciones
  FOR DELETE USING (get_my_role() = 'admin');

-- Mensajes: dueño e insert + select
DROP POLICY IF EXISTS "Ver mensajes de conversaciones propias" ON mensajes;
CREATE POLICY "Ver mensajes de conversaciones propias" ON mensajes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversaciones c
      WHERE c.id = mensajes.conversacion_id
      AND (c.user_id = auth.uid() OR get_my_role() IN ('ejecutivo', 'admin'))
    )
  );

DROP POLICY IF EXISTS "Insertar mensajes en conversaciones propias" ON mensajes;
CREATE POLICY "Insertar mensajes en conversaciones propias" ON mensajes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversaciones c
      WHERE c.id = mensajes.conversacion_id AND c.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_conversaciones_user_estado
  ON conversaciones(user_id, estado, deleted_at DESC NULLS LAST);
