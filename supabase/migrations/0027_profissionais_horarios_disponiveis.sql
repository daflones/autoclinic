-- Add horarios_disponiveis JSONB column to profissionais_clinica
ALTER TABLE profissionais_clinica
ADD COLUMN IF NOT EXISTS horarios_disponiveis jsonb DEFAULT NULL;

-- Add especialidades column if not exists (ensure it's stored as jsonb array)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profissionais_clinica' AND column_name = 'especialidades'
  ) THEN
    ALTER TABLE profissionais_clinica ADD COLUMN especialidades jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

COMMENT ON COLUMN profissionais_clinica.horarios_disponiveis IS 'JSONB with available hours per day of week. Format: { segunda: { ativo: true, periodos: [{ inicio: "08:00", fim: "18:00" }] }, ... }';
COMMENT ON COLUMN profissionais_clinica.especialidades IS 'Array of specialty strings for the professional';
