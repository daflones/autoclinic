Preciso adicionar o Cloudflare Turnstile (captcha) nas páginas de cadastro, login e esqueceu a senha.
Regra principal: O usuário só consegue submeter qualquer formulário após passar pela verificação do Turnstile. O captcha é a primeira barreira, antes de qualquer processamento.
Fluxo em todas as 3 páginas:

Usuário preenche o formulário
Resolve o Turnstile (widget managed)
Frontend envia os dados + captchaToken
Backend valida o token na Cloudflare antes de qualquer lógica
Se captcha inválido → rejeita com erro 400
Se válido → processa normalmente (cadastro / login / reset de senha)

Frontend — adicionar em cada formulário:
html<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async></script>
<div class="cf-turnstile" data-sitekey="0x4AAAAAAC1GLg91CsyHG0lg"></div>
Pegar o token e enviar no body: document.querySelector('[name="cf-turnstile-response"]').value
Backend — função reutilizável:
javascriptasync function validateCaptcha(token) {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: '0x4AAAAAAC1GLvcjDGEkJCq1f0gPctkBe5s',
      response: token
    })
  });
  const data = await res.json();
  return data.success;
}
Usar essa função no início de cada endpoint: POST /register, POST /login, POST /forgot-password. Se validateCaptcha retornar false, rejeitar com status 400 e { error: 'Captcha inválido' }.
Tipo do widget: Managed (invisível para usuários reais, desafio só para bots).


Site Key
0x4AAAAAAClGLg91CsyHG0lg


Secret Key
0x4AAAAAAClGLvCjDGEkJCq1f0gPctkBe5s