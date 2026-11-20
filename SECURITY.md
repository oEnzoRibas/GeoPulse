# Política de segurança

## Como comunicar uma vulnerabilidade

Envie uma mensagem privada ao mantenedor com o assunto **GeoPulse · segurança**. O perfil abaixo é o contato profissional indicado no portfólio de oEnzoRibas. [Contato do mantenedor no LinkedIn](https://www.linkedin.com/in/oenzoribas/)

Se você não conseguir iniciar a conversa por esse canal, abra uma issue intitulada **Solicitação de contato de segurança** e peça um canal privado. Reserve os detalhes técnicos e as evidências para a conversa privada.

No relato, identifique a versão ou o commit, o componente afetado (frontend, API, banco ou importação), o comportamento observado e o impacto. Se incluir capturas ou registros, remova credenciais, dados pessoais e endereços de instalações privadas.

## Versões e correções

O projeto concentra as correções de segurança na release mais recente. As notas de cada versão identificam as mudanças disponíveis e as instruções de atualização pertinentes. [Releases do GeoPulse](https://github.com/oEnzoRibas/GeoPulse/releases)

## Configuração de implantação

As credenciais padrão do Docker Compose são destinadas ao desenvolvimento local. Para uma implantação, configure credenciais próprias no ambiente do servidor e restrinja `CORS_ORIGINS` às origens da aplicação. Variáveis com prefixo `NEXT_PUBLIC_` são incorporadas ao frontend e ficam acessíveis ao navegador.

O GitHub monitora dependências conhecidas pelo Dependabot. Relatos sobre a aplicação e sua configuração também podem ser enviados pelo canal acima.
