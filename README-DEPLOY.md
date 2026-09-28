# Eventos Sandra Campos — pacote para Vercel

Esta pasta contém somente os arquivos públicos do site. `index.html`, os arquivos CSS/JS e `assets/` devem ficar juntos na raiz do repositório Git.

## Publicar pelo Git

1. Crie um repositório vazio no GitHub.
2. Coloque **o conteúdo desta pasta** na raiz do repositório e faça o commit pelo GitHub Desktop ou pela linha de comando. Não envie apenas o ZIP.
3. Na Vercel, importe esse repositório.
4. Configure **Framework Preset: Other**. Deixe **Build Command** vazio e use **Output Directory: `.`** (raiz). A Root Directory do projeto também deve ser a raiz do repositório.
5. Faça o deploy.

O projeto é HTML/CSS/JavaScript estático e não precisa de instalação de dependências nem de etapa de build.

As cópias de `graçons.mp4` e `video comida.mp4` neste pacote foram encurtadas, sem recompressão, para 22,69 MiB e 23,78 MiB. Os arquivos originais continuam preservados em `assets/events/` no projeto de trabalho.

**Importante:** extraia o ZIP antes de enviar os arquivos ao GitHub. Todos os arquivos deste pacote agora estão abaixo de 25 MiB cada. Não suba `AGENTS.md`, `briefing.md`, `references/`, a pasta `.sites-publish/` ou os arquivos de desenvolvimento do diretório original junto com este pacote.
