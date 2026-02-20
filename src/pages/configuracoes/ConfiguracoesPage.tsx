import { useState, useEffect } from 'react'
// Card components no longer used after style standardization
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Settings, User, Check, Loader2, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { 
  useConfiguracoes, 
  useProfile, 
  useUpdateProfile,
  useUpdateDetalhesEmpresa
} from '@/hooks/useConfiguracoes'
import { useIAConfig } from '@/hooks/useIAConfig'

// Função para formatar telefone
const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return value
}

interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  cargo?: string
  role: 'admin' | 'vendedor'
  status: 'ativo' | 'inativo'
  admin_profile_id?: string
  created_at: string
  updated_at: string
}

export function ConfiguracoesPage() {
  const [activeSection, setActiveSection] = useState('perfil')
  const { user } = useAuthStore()
  
  // Usar hooks para dados e ações
  const { isLoading: loadingConfiguracoes } = useConfiguracoes()
  const { data: profileData, isLoading: loadingProfile } = useProfile()
  const { data: iaConfigData } = useIAConfig()
  const updateProfile = useUpdateProfile()
  const updateDetalhesEmpresaMutation = useUpdateDetalhesEmpresa()
  
  const [profile, setProfile] = useState<Partial<Profile>>({
    full_name: '',
    email: '',
    phone: '',
    cargo: ''
  })
  
  const [detalhesEmpresa, setDetalhesEmpresa] = useState({
    contatos: {
      telefone: '',
      email: '',
      whatsapp: '',
      endereco: ''
    },
    redes_sociais: {
      website: '',
      facebook: '',
      linkedin: '',
      instagram: ''
    }
  })
  

  const loading = loadingConfiguracoes || loadingProfile
  
  // Atualizar estado local quando os dados chegarem
  useEffect(() => {
    if (profileData) {
      setProfile({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        phone: profileData.telefone || '',
        cargo: profileData.cargo || ''
      })
      
      // Atualizar telefone em detalhes da empresa se existir no perfil
      if (profileData.telefone) {
        setDetalhesEmpresa(prev => ({
          ...prev,
          contatos: {
            ...prev.contatos,
            telefone: profileData.telefone
          }
        }))
      }
    }
  }, [profileData])

  // Carregar detalhes da empresa salvos no ia_config
  useEffect(() => {
    if (iaConfigData?.detalhes_empresa) {
      setDetalhesEmpresa({
        contatos: {
          telefone: iaConfigData.detalhes_empresa.contatos?.telefone || '',
          email: iaConfigData.detalhes_empresa.contatos?.email || '',
          whatsapp: iaConfigData.detalhes_empresa.contatos?.whatsapp || '',
          endereco: iaConfigData.detalhes_empresa.contatos?.endereco || ''
        },
        redes_sociais: {
          website: iaConfigData.detalhes_empresa.redes_sociais?.website || '',
          facebook: iaConfigData.detalhes_empresa.redes_sociais?.facebook || '',
          linkedin: iaConfigData.detalhes_empresa.redes_sociais?.linkedin || '',
          instagram: iaConfigData.detalhes_empresa.redes_sociais?.instagram || ''
        }
      })
    }
  }, [iaConfigData])


  const handleSaveProfile = () => {
    if (!user?.id) return
    updateProfile.mutate(profile)
  }

  const handleSaveDetalhesEmpresa = () => {
    // Adicionar o email do perfil aos detalhes da empresa
    const detalhesComEmail = {
      ...detalhesEmpresa,
      contatos: {
        ...detalhesEmpresa.contatos,
        email: profile.email || profileData?.email || ''
      }
    }
    updateDetalhesEmpresaMutation.mutate(detalhesComEmail)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          Configurações da Clínica
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie as configurações do sistema e preferências da clínica
        </p>
      </header>

      <div className="flex gap-6">
        {/* Left sidebar - Navigation */}
        <div className="w-72 flex-shrink-0">
          <div className="rounded-3xl border border-border/60 bg-background/80 p-4 shadow-lg backdrop-blur">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4" />
              Categorias
            </h2>
            <div className="space-y-1">
              <Button 
                variant={activeSection === 'perfil' ? 'default' : 'ghost'} 
                size="sm"
                className={cn(
                  "w-full justify-start text-sm",
                  activeSection === 'perfil' && "bg-primary text-white"
                )}
                onClick={() => setActiveSection('perfil')}
              >
                <User className="w-4 h-4 mr-2" />
                Perfil
              </Button>
              <Button 
                variant={activeSection === 'empresa' ? 'default' : 'ghost'} 
                size="sm"
                className={cn(
                  "w-full justify-start text-sm",
                  activeSection === 'empresa' && "bg-primary text-white"
                )}
                onClick={() => setActiveSection('empresa')}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Detalhes da Empresa
              </Button>
            </div>
          </div>
        </div>

        {/* Right content - Settings panels */}
        <div className="flex-1 space-y-6">
          
          {/* Profile Settings */}
          {activeSection === 'perfil' && (
            <div className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Perfil
                </h2>
                <p className="text-sm text-muted-foreground">
                  Gerencie suas informações pessoais e dados do perfil.
                </p>
              </div>
              <div className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name" className="text-sm">Nome da Empresa *</Label>
                        <Input 
                          id="name" 
                          placeholder="Nome da sua empresa"
                          value={profile.full_name}
                          onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email" className="text-sm">Email *</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="seu@email.com"
                          value={profile.email}
                          onChange={(e) => setProfile({...profile, email: e.target.value})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone" className="text-sm">Telefone</Label>
                        <Input 
                          id="phone" 
                          placeholder="(11) 99999-9999"
                          value={profile.phone}
                          onChange={(e) => setProfile({...profile, phone: formatPhone(e.target.value)})}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="role" className="text-sm">Cargo</Label>
                        <Input 
                          id="role" 
                          value={profileData?.role === 'admin' ? 'Administrador' : 'Vendedor'}
                          disabled
                          className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleSaveProfile}
                      disabled={updateProfile.isPending}
                    >
                      {updateProfile.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Company Details Settings */}
          {activeSection === 'empresa' && (
            <div className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Detalhes da Empresa
                </h2>
                <p className="text-sm text-muted-foreground">
                  Configure as informações da sua empresa para uso na IA.
                </p>
              </div>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-3">Contatos</h4>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="empresa_telefone" className="text-sm">Telefone</Label>
                        <Input 
                          id="empresa_telefone" 
                          placeholder="(11) 99999-9999"
                          value={detalhesEmpresa.contatos.telefone}
                          onChange={(e) => setDetalhesEmpresa({
                            ...detalhesEmpresa,
                            contatos: { ...detalhesEmpresa.contatos, telefone: formatPhone(e.target.value) }
                          })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="empresa_whatsapp" className="text-sm">WhatsApp</Label>
                        <Input 
                          id="empresa_whatsapp" 
                          placeholder="(11) 99999-9999"
                          value={detalhesEmpresa.contatos.whatsapp}
                          onChange={(e) => setDetalhesEmpresa({
                            ...detalhesEmpresa,
                            contatos: { ...detalhesEmpresa.contatos, whatsapp: formatPhone(e.target.value) }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-3">Endereço</h4>
                    <div className="grid gap-2">
                      <Label htmlFor="empresa_endereco" className="text-sm">Endereço Completo</Label>
                      <Input 
                        id="empresa_endereco" 
                        placeholder="Rua, número, bairro, cidade - UF"
                        value={detalhesEmpresa.contatos.endereco}
                        onChange={(e) => setDetalhesEmpresa({
                          ...detalhesEmpresa,
                          contatos: { ...detalhesEmpresa.contatos, endereco: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-3">Redes Sociais</h4>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="empresa_website" className="text-sm">Website</Label>
                        <Input 
                          id="empresa_website" 
                          placeholder="https://www.suaempresa.com"
                          value={detalhesEmpresa.redes_sociais.website}
                          onChange={(e) => setDetalhesEmpresa({
                            ...detalhesEmpresa,
                            redes_sociais: { ...detalhesEmpresa.redes_sociais, website: e.target.value }
                          })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="empresa_facebook" className="text-sm">Facebook</Label>
                        <Input 
                          id="empresa_facebook" 
                          placeholder="https://facebook.com/suaempresa"
                          value={detalhesEmpresa.redes_sociais.facebook}
                          onChange={(e) => setDetalhesEmpresa({
                            ...detalhesEmpresa,
                            redes_sociais: { ...detalhesEmpresa.redes_sociais, facebook: e.target.value }
                          })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="empresa_linkedin" className="text-sm">LinkedIn</Label>
                        <Input 
                          id="empresa_linkedin" 
                          placeholder="https://linkedin.com/company/suaempresa"
                          value={detalhesEmpresa.redes_sociais.linkedin}
                          onChange={(e) => setDetalhesEmpresa({
                            ...detalhesEmpresa,
                            redes_sociais: { ...detalhesEmpresa.redes_sociais, linkedin: e.target.value }
                          })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="empresa_instagram" className="text-sm">Instagram</Label>
                        <Input 
                          id="empresa_instagram" 
                          placeholder="https://instagram.com/suaempresa"
                          value={detalhesEmpresa.redes_sociais.instagram}
                          onChange={(e) => setDetalhesEmpresa({
                            ...detalhesEmpresa,
                            redes_sociais: { ...detalhesEmpresa.redes_sociais, instagram: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full"
                  onClick={handleSaveDetalhesEmpresa}
                  disabled={updateDetalhesEmpresaMutation.isPending}
                >
                  {updateDetalhesEmpresaMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Salvar Detalhes da Empresa
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
