# Publicação e Releases

## Versionamento

O projeto segue [SemVer](https://semver.org/lang/pt-BR/):

- **MAJOR** — mudanças incompatíveis (ex.: alteração do `id` do plugin ou do
  formato do estado salvo).
- **MINOR** — novos recursos compatíveis.
- **PATCH** — correções compatíveis.

A versão aparece em **dois lugares** e precisa ficar sincronizada:

- `manifest.json` → `version`
- `package.json` → `version`

O nome do zip é derivado do manifesto: `release/<id>-<versão>.zip`, por exemplo
`com.beone.biblia-pro-1.0.0.zip`.

## Fluxo de release

### 1. Prepara a versão

```bash
# escolha a nova versão, ex.: 1.0.1
npm version patch --no-git-tag-version   # atualiza package.json
# edite manifest.json → "version": "1.0.1"
```

Atualize o `CHANGELOG.md`:

- Mova os itens de `[Não publicado]` para a nova seção `[1.0.1] — AAAA-MM-DD`.
- Deixe uma seção `[Não publicado]` vazia no topo.

### 2. Verifica e empacota

```bash
npm run typecheck
npm run build
npm run package
```

Confirme o zip em `release/com.beone.biblia-pro-<versão>.zip`.

### 3. Commita e cria a tag

```bash
git add -A
git commit -m "chore(release): v1.0.1"
git tag -a v1.0.1 -m "Bíblia PRO v1.0.1"
git push origin main
git push origin v1.0.1
```

### 4. GitHub Release

O workflow `.github/workflows/release.yml` é disparado por tags `v*` e:

1. Instala dependências com `npm ci`.
2. Roda `npm run package`.
3. Cria a Release anexando o zip gerado.

Se precisar publicar manualmente:

```bash
gh release create v1.0.1 release/com.beone.biblia-pro-1.0.1.zip \
  --title "Bíblia PRO v1.0.1" \
  --notes-file CHANGELOG.md
```

## CI

`.github/workflows/ci.yml` roda em todo push para `main` e em pull requests:

- `npm ci`
- `npm run typecheck`
- `npm run build`
- `npm run package`
- upload do zip como artifact

O badge do README aponta para esse workflow.

## O que é versionado

| Caminho | Versionado? |
| --- | --- |
| `src/`, `scripts/`, `docs/`, `.github/` | ✅ |
| `manifest.json`, `package.json`, `package-lock.json` | ✅ |
| `sdk/spresenter-plugin-sdk.tgz` | ✅ (dependência `file:`) |
| `node_modules/`, `dist/`, `release/` | ❌ |

O binário é distribuído pelas **Releases**, não pelo repositório.

## Checklist de release

- [ ] `manifest.json` e `package.json` com a mesma versão
- [ ] `CHANGELOG.md` atualizado
- [ ] `npm run typecheck` limpo
- [ ] `npm run build` limpo
- [ ] `npm run package` gerou o zip
- [ ] Teste de fumaça no Spresenter (instalar o zip, abrir o painel, projetar)
- [ ] Commit `chore(release): vX.Y.Z`
- [ ] Tag `vX.Y.Z` enviada
- [ ] Release publicada com o zip anexado
