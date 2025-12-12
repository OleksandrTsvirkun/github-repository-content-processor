# GitHub Repository Content Processor - GitHub Action

GitHub Action для автоматичної валідації контенту markdown файлів у репозиторії.

## Особливості

### ✅ Автоматична валідація
- Автоматично валідує markdown файли при push та pull request
- Створює GitHub Check Runs з детальними результатами
- Підтримує frontmatter валідацію
- Перевіряє структуру та ієрархію контенту

### 🔄 Async Generators для Streaming
- Використовує async generators для обробки файлів
- Streaming обробка замість завантаження всього в пам'ять
- Підтримка великих репозиторіїв без OOM

### 🛡️ Retry Logic та Rate Limiting
- `RateLimitHandler`: автоматичне відстеження GitHub API rate limits
- `RetryHandler`: exponential backoff для помилок (1s, 2s, 4s, 8s...)
- `ParallelBatchHandler`: контрольована паралельна обробка (10 файлів за раз)

### 📦 Large File Support
- Підтримка файлів >1MB через GitHub Git Blob API
- Автоматичне переключення між Content API та Blob API

## Використання

### Базове використання

Створіть файл `.github/workflows/content-validation.yml` у вашому репозиторії:

```yaml
name: Content Validation

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  validate:
    name: Validate Content
    runs-on: ubuntu-latest
    permissions:
      contents: read
      checks: write
      pull-requests: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Run content validation
        uses: oleksandrtsvirkun/github-repository-content-processor@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Налаштування

#### Inputs

- `github-token` (обов'язковий): GitHub token для доступу до API. Використовуйте `${{ secrets.GITHUB_TOKEN }}` для публічних репозиторіїв або Personal Access Token для приватних

> **Примітка для приватних репозиторіїв:**  
> `GITHUB_TOKEN` має обмежені права для приватних репозиторіїв. Створіть [Personal Access Token (PAT)](https://github.com/settings/tokens) з правами `repo` та використовуйте його замість `GITHUB_TOKEN`:
> ```yaml
> github-token: ${{ secrets.PAT_TOKEN }}
> ```

#### Outputs

- `total-files`: Загальна кількість перевірених файлів
- `valid-files`: Кількість валідних файлів
- `invalid-files`: Кількість невалідних файлів
- `conclusion`: Результат перевірки (`success` або `failure`)

### Приклад з використанням outputs

```yaml
- name: Run content validation
  id: validate
  uses: oleksandrtsvirkun/github-repository-content-processor@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Print results
  run: |
    echo "Total files: ${{ steps.validate.outputs.total-files }}"
    echo "Valid files: ${{ steps.validate.outputs.valid-files }}"
    echo "Invalid files: ${{ steps.validate.outputs.invalid-files }}"
```

## Локальна розробка

### Передумови

1. **Node.js 20+** та **npm**
2. Git

### Налаштування

1. Клонуйте репозиторій:
   ```powershell
   git clone https://github.com/oleksandrtsvirkun/github-repository-content-processor.git
   cd github-repository-content-processor
   ```

2. Встановіть залежності:
   ```powershell
   npm install
   ```

3. Зберіть проєкт:
   ```powershell
   npm run build
   ```

### Структура проєкту

```
src/
  ├── index.ts                    # Entry point для GitHub Action
  ├── services/
  │   ├── GitHubClient.ts        # GitHub API клієнт
  │   └── ContentProcessor.ts    # Логіка валідації контенту
  ├── validations/               # Валідатори
  ├── utils/                     # Утиліти (rate limiting, retry, etc.)
  └── types/                     # TypeScript типи
```

### Скрипти

- `npm run build` - Збірка проєкту
- `npm run watch` - Збірка в режимі watch
- `npm run clean` - Очистити директорію dist
- `npm run format` - Форматування коду
- `npm run format:check` - Перевірка форматування

## Що валідується

Action перевіряє наступне:

1. **Frontmatter**
   - Наявність frontmatter у markdown файлах
   - Обов'язкові поля
   - Формат даних

2. **Структура контенту**
   - Ієрархія файлів та директорій
   - Правильність шляхів
   - Унікальність ідентифікаторів

3. **Markdown синтаксис**
   - Коректність markdown розмітки
   - Посилання
   - Зображення

## Permissions

GitHub Action потребує наступних прав:

```yaml
permissions:
  contents: read        # Для читання файлів репозиторію
  checks: write        # Для створення check runs
  pull-requests: write # Для коментарів у PR (опційно)
```

## Troubleshooting

### Action не запускається

Переконайтеся, що у workflow файлі вказані правильні triggers:
- `push` для перевірки при push
- `pull_request` для перевірки PR

### Помилки доступу до API

Переконайтеся, що:
- Вказано `github-token: ${{ secrets.GITHUB_TOKEN }}`
- У job є необхідні `permissions`
- Для **приватних репозиторіїв** використовуйте PAT замість `GITHUB_TOKEN`:
  1. Створіть [Personal Access Token](https://github.com/settings/tokens/new) з правами:
     - `repo` (Full control of private repositories)
     - `read:org` (якщо репозиторій в організації)
  2. Додайте PAT як secret у Settings → Secrets and variables → Actions
  3. Використовуйте: `github-token: ${{ secrets.PAT_TOKEN }}`

### Rate limiting

Action автоматично обробляє rate limits GitHub API. Якщо ви зустрічаєте проблеми:
- Зменшіть `maxParallel` у `ParallelBatchHandler`
- Збільшіть `rateLimitThreshold` у `RateLimitHandler`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
