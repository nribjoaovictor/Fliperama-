# Fliperama local — Recreio Arcade (G3)

O G3 executa os jogos aprovados na API do G1, captura o placar enviado pelo jogo, pede a avaliação e envia a partida ao G1. O ranking é por jogo; o Portal do G2 consulta os dados do G1.

**Como rodar e configurar a estação:** [instruções do fliperama local](fliperama-local/README.md). O servidor sincroniza os jogos aprovados ao iniciar, a cada 3 horas e pelo botão em `/manage`. A fila de partidas preserva os resultados quando a rede cai, e cada reenvio usa o mesmo ID para evitar duplicações.

Conforme o [contrato atualizado da turma](https://github.com/Arcade-IFES/Plataforma-Gestao-API/blob/develop/docs/integracao.md), o apelido é preenchido ao terminar **dentro do jogo** e o G3 pede a nota. Não há coleta de matrícula. Os jogos antigos precisam publicar um pacote válido no G1 e emitir `PLACAR` para entrarem no catálogo oficial.
