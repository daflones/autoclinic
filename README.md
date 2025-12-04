# Automaclinic

Repositório inicial para o CRM voltado a clínicas de estética.

## Próximos passos

1. Inicializar o Git apontando para o novo repositório:
   ```bash
   git init
   git remote add origin git@github.com:daflones/automaclinic.git
   git checkout -b main
   ```
2. Copiar/adaptar os módulos necessários do projeto original (NanoSync CRM) para esta pasta.
3. Ajustar `package.json`, assets e configurações de ambiente para o novo domínio.
4. Criar migrações Supabase específicas (procedimentos, profissionais, prontuários, pacientes).
5. Fazer o primeiro commit e enviar para o repositório remoto:
   ```bash
   git add .
   git commit -m "chore: inicia projeto Automaclinic"
   git push -u origin main
   ```
