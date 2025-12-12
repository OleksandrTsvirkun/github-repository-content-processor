# GitHub Repository Content Processor

Конвертація з Azure Functions на GitHub Action завершена! ✅

## Основні зміни

### Видалено
- ❌ Azure Functions (`host.json`, `local.settings.json`, `src/functions/`)
- ❌ Azure Service Bus залежності (`@azure/functions`, `@azure/service-bus`)
- ❌ GitHub App authentication (`@octokit/auth-app`)
- ❌ Монорепо залежності (`@repo/collections`, `@repo/typescript-config`)

### Додано
- ✅ GitHub Action metadata (`action.yml`)
- ✅ GitHub Actions workflow (`.github/workflows/content-validation.yml`)
- ✅ GitHub Actions SDK (`@actions/core`, `@actions/github`)
- ✅ Entry point для action (`src/index.ts`)
- ✅ Вбудовані utility функції (partition, partitionAsync)

### Оновлено
- 🔄 `GitHubClient` - використовує простий token замість GitHub App
- 🔄 `ContentProcessor` - використовує `@actions/core` замість Azure context
- 🔄 `package.json` - оновлено залежності та скрипти
- 🔄 `tsconfig.json` - видалено монорепо конфіг
- 🔄 `tsup.config.ts` - налаштовано для single entry point
- 🔄 `README.md` - документація для GitHub Action

## Наступні кроки

1. **Встановіть залежності:**
   ```bash
   npm install
   ```

2. **Зберіть проєкт:**
   ```bash
   npm run build
   ```

3. **Використовуйте в своєму репозиторії:**
   
   Створіть `.github/workflows/content-validation.yml`:
   ```yaml
   name: Content Validation
   
   on:
     push:
       branches: [main, develop]
     pull_request:
       types: [opened, synchronize, reopened]
   
   jobs:
     validate:
       runs-on: ubuntu-latest
       permissions:
         contents: read
         checks: write
       steps:
         - uses: actions/checkout@v4
           with:
             fetch-depth: 0
         
         - uses: actions/setup-node@v4
           with:
             node-version: '20'
         
         - uses: oleksandrtsvirkun/github-repository-content-processor@v1
           with:
             github-token: ${{ secrets.GITHUB_TOKEN }}
   ```

4. **Опубліку action (опційно):**
   - Додайте тег версії: `git tag -a v1.0.0 -m "Initial release"`
   - Push тег: `git push origin v1.0.0`
   - Створіть GitHub Release

## Як це працює

1. **Trigger**: Workflow запускається при push або pull_request
2. **Checkout**: Отримує код репозиторію
3. **Setup Node**: Встановлює Node.js 20
4. **Build**: Збирає action (якщо потрібно)
5. **Validate**: 
   - Визначає змінені файли
   - Створює GitHub Check Run
   - Валідує markdown файли
   - Оновлює Check Run з результатами
6. **Result**: Показує результат як GitHub Check

## Детальна документація

Дивіться [README.md](./README.md) для повної документації.
