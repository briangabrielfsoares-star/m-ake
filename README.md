# ICANT — site pronto

Arquivos principais:

- `index.html` — loja
- `admin.html` — painel admin
- `/admin/` — também abre o painel no Vercel
- `css/styles.css` — visual do site
- `js/data.js` — produtos fake iniciais
- `assets/products/` — imagens fake dos produtos no estilo do mockup

## Login do painel

Senha: `secret`

Acesse:

- `https://SEU-SITE.vercel.app/admin/`
- ou `https://SEU-SITE.vercel.app/admin.html`

## O que já está funcionando

- Visual dark premium parecido com a referência aprovada.
- Produtos fake com imagens.
- Grade por categoria: camisetas, calças, calçados e acessórios.
- Carrinho.
- Checkout.
- PIX copia e cola + QR Code, depois que você colocar sua chave PIX no painel.
- Botão para enviar pedido no WhatsApp, depois que você colocar o número no painel.
- Atendimento no app + WhatsApp.
- Painel para adicionar, editar e excluir produtos.
- Upload de imagem por arquivo ou URL.
- Backup/exportação/importação de produtos, pedidos, atendimentos e configurações.

## Configuração rápida

1. Abra `/admin/`.
2. Entre com a senha.
3. Vá em **Configurações**.
4. Coloque:
   - WhatsApp da loja com DDI e DDD, exemplo: `5531999999999`
   - Chave PIX
   - Nome do recebedor PIX
   - Cidade PIX
   - Instagram
5. Salve.

## Importante sobre produção

Este pacote é um site estático para GitHub + Vercel. Ele vende via carrinho + PIX + WhatsApp.

Para painel admin com banco de dados sincronizado entre todos os aparelhos e pedidos aparecendo automaticamente no painel de qualquer lugar, precisa plugar Firebase/Firestore ou outro backend. Sem backend, alterações feitas no painel ficam salvas no navegador usado. Mesmo assim, o cliente consegue comprar e enviar o pedido pelo WhatsApp com PIX.
