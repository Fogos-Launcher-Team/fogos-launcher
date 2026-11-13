const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const api = window.lmAPI;

const ICON_PATHS = {
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  folderOpen: '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>'
};

function icon(name, size = 16) {
  if (name === 'microsoft') {
    return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="2" y="2" width="9.5" height="9.5" fill="#f25022"/><rect x="12.5" y="2" width="9.5" height="9.5" fill="#7fba00"/><rect x="2" y="12.5" width="9.5" height="9.5" fill="#00a4ef"/><rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#ffb900"/></svg>`;
  }
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ''}</svg>`;
}

function injectIcons() {
  $$('[data-icon]').forEach((el) => {
    if (el.querySelector(':scope > svg.ic')) return;
    const size = el.closest('.winctl') ? 14 : 16;
    el.insertAdjacentHTML(el.dataset.iconPos === 'end' ? 'beforeend' : 'afterbegin', icon(el.dataset.icon, size));
  });
}

const translations = {
  en: {
    btn_ely_login: "Login via Ely.by", ely_browser_hint: "Finish signing in in your browser. Click the button again to cancel.",
    import_name_title: "Instance name", btn_import_do: "Import", importing: "Importing...", error_import: "Import error", import_partial: "Some files failed to download",
    tab_play: "Play", tab_instances: "Instances", tab_catalog: "Catalog", tab_accounts: "Accounts", tab_settings: "Settings",
    play_title: "Play", btn_launch: "Launch Minecraft", btn_launch_kill: "Close Game",
    instances_title: "Instances", btn_create: "+ Create", btn_import_mrpack: "Import .mrpack", btn_import_zip_cf: "Import CF .zip", btn_import_zip_prism: "Import Prism .zip",
    catalog_title: "Catalog", cat_search: "Search...", cat_mods: "Mods", cat_resourcepacks: "Resource Packs", cat_shaders: "Shaders", cat_worlds: "Worlds (CF)", cat_datapacks: "Datapacks", cat_modpacks: "Modpacks",
    btn_prev: "Prev", btn_next: "Next", page_info: "Page",
    accounts_title: "Accounts", acc_offline: "Offline", acc_nick: "Nickname (3-16 chars)", btn_add: "Add", acc_email: "Email / login", acc_pass: "Password", btn_login: "Login", btn_ms_login: "Login with Microsoft",
    settings_title: "Settings", set_lang: "Language", set_theme: "Theme", theme_dark: "Dark", theme_light: "Light", set_java: "Java path (empty = auto)",
    set_repair_title: "Repair files", set_repair_desc: "If sounds, main menu background or language are missing — press the button.", btn_repair_assets: "Repair assets",
    modal_create_title: "Create Instance", modal_name: "Name", modal_version: "Minecraft Version", modal_loader: "Mod Loader", modal_loader_ver: "Loader Version",
    btn_cancel: "Cancel", btn_create_do: "Create", btn_save: "Save", btn_delete: "Delete", btn_install: "Install", btn_manage_mods: "Manage Content",
    modal_icon: "Icon (Emoji or URL)", modal_group: "Group", modal_mc_version: "Minecraft Version", modal_ram: "RAM (Min / Max MB)", modal_java: "Java path (empty = global)", modal_jvm: "JVM args", modal_notes: "Notes", btn_open_folder: "Open game folder", btn_export_mrpack: "Export to .mrpack", btn_export_zip: "Export to .zip",
    modal_mods_title: "Installed Content", btn_open_mods_folder: "Open Folder", drag_drop_hint: "Drag & Drop files here to install",
    confirm_title: "Are you sure?", no_instances: "No instances", no_accounts: "No accounts", nothing_found: "Nothing found", no_mods: "No content installed",
    searching: "Searching...", error_offline_nick: "Error: only English letters and numbers (3-16 chars)", error_ely: "Ely.by Error", error_ms: "Microsoft Error",
    inst_deleted: "Instance deleted", inst_created: "Instance created", inst_imported: "Instance imported", settings_saved: "Settings saved", acc_added: "Account added",
    success_inst: "Installed!", error_inst: "Error", success_del: "Deleted!", error_del: "Delete Error", error_launch: "Launch Error", success_export: "Exported!",
    log_game_closed: "Game closed.", log_game_launched: "Game launched!", log_launching: "Launching...", log_error: "Error: ",
    err_world_cf: "Worlds only in CurseForge", err_select_inst: "Select instance", err_select_acc: "Select account", err_enter_name: "Enter name",
    mods_enabled: "Enabled", mods_disabled: "Disabled", warning_change_version: "Warning: Changing version may break mods!",
    crash_title: "Game Crashed", crash_reason: "Reason", crash_unknown: "Something went wrong...", btn_open_log: "Open Log", btn_close: "Close",
    err_acc_exists: "Account with this name already exists!", downloading_dep: "Downloading dependency...",
    type_java: "Java Edition", type_bedrock: "Bedrock Edition (Coming soon...)", auto_select: "Auto (Recommended)", installing_loader: "Installing mod loader..."
  },
  ru: {
    btn_ely_login: "Войти через Ely.by", ely_browser_hint: "Завершите вход в браузере. Нажмите кнопку ещё раз, чтобы отменить.",
    import_name_title: "Название сборки", btn_import_do: "Импортировать", importing: "Импорт...", error_import: "Ошибка импорта", import_partial: "Часть файлов не удалось скачать",
    tab_play: "Играть", tab_instances: "Сборки", tab_catalog: "Каталог", tab_accounts: "Аккаунты", tab_settings: "Настройки",
    play_title: "Играть", btn_launch: "Запустить Minecraft", btn_launch_kill: "Закрыть игру",
    instances_title: "Сборки", btn_create: "+ Создать", btn_import_mrpack: "Импорт .mrpack", btn_import_zip_cf: "Импорт CF .zip", btn_import_zip_prism: "Импорт Prism .zip",
    catalog_title: "Каталог", cat_search: "Поиск...", cat_mods: "Моды", cat_resourcepacks: "Ресурспаки", cat_shaders: "Шейдеры", cat_worlds: "Карты (CF)", cat_datapacks: "Датапаки", cat_modpacks: "Сборки",
    btn_prev: "Назад", btn_next: "Вперед", page_info: "Стр.",
    accounts_title: "Аккаунты", acc_offline: "Оффлайн", acc_nick: "Ник (3-16 символов)", btn_add: "Добавить", acc_email: "Email / логин", acc_pass: "Пароль", btn_login: "Войти", btn_ms_login: "Войти через Microsoft",
    settings_title: "Настройки", set_lang: "Язык", set_theme: "Тема", theme_dark: "Тёмная", theme_light: "Светлая", set_java: "Java path (пусто = авто)",
    set_repair_title: "Восстановление файлов", set_repair_desc: "Если пропали звуки, фон главного меню или язык — нажми кнопку.", btn_repair_assets: "Восстановить ассеты",
    modal_create_title: "Создание сборки", modal_name: "Название", modal_version: "Версия Minecraft", modal_loader: "Загрузчик модов", modal_loader_ver: "Версия загрузчика",
    btn_cancel: "Отмена", btn_create_do: "Создать", btn_save: "Сохранить", btn_delete: "Удалить", btn_install: "Установить", btn_manage_mods: "Управление контентом",
    modal_icon: "Иконка (Emoji или URL)", modal_group: "Группа", modal_mc_version: "Версия Minecraft", modal_ram: "ОЗУ (Мин / Макс MB)", modal_java: "Java path (пусто = глобальный)", modal_jvm: "JVM аргументы", modal_notes: "Заметки", btn_open_folder: "Открыть папку игры", btn_export_mrpack: "Экспорт в .mrpack", btn_export_zip: "Экспорт в .zip",
    modal_mods_title: "Установленный контент", btn_open_mods_folder: "Открыть папку", drag_drop_hint: "Перетащи файлы сюда для установки",
    confirm_title: "Вы уверены?", no_instances: "Сборок пока нет", no_accounts: "Нет аккаунтов", nothing_found: "Ничего не найдено", no_mods: "Контент не установлен",
    searching: "Поиск...", error_offline_nick: "Ошибка: только английские буквы и цифры (3-16 символов)", error_ely: "Ошибка Ely.by", error_ms: "Ошибка Microsoft",
    inst_deleted: "Сборка удалена", inst_created: "Сборка создана", inst_imported: "Сборка импортирована", settings_saved: "Настройки сохранены", acc_added: "Аккаунт добавлен",
    success_inst: "Установлено!", error_inst: "Ошибка", success_del: "Удалено!", error_del: "Ошибка удаления", error_launch: "Ошибка запуска", success_export: "Экспортировано!",
    log_game_closed: "Игра закрыта.", log_game_launched: "Игра запущена!", log_launching: "Запуск...", log_error: "Ошибка: ",
    err_world_cf: "Карты только в CurseForge", err_select_inst: "Выбери сборку", err_select_acc: "Выбери аккаунт", err_enter_name: "Введи название",
    mods_enabled: "Включен", mods_disabled: "Отключен", warning_change_version: "Внимание: смена версии может сломать моды!",
    crash_title: "Игра крашнулась", crash_reason: "Причина", crash_unknown: "Что-то пошло не так...", btn_open_log: "Открыть лог", btn_close: "Закрыть",
    err_acc_exists: "Аккаунт с таким именем уже существует!", downloading_dep: "Скачиваем зависимость...",
    type_java: "Java Edition", type_bedrock: "Bedrock Edition (Будет доступно в будущем...)", auto_select: "Авто (Рекомендуется)", installing_loader: "Установка загрузчика модов..."
  },
  zh: {
    btn_ely_login: "通过 Ely.by 登录", ely_browser_hint: "请在浏览器中完成登录。再次点击按钮可取消。",
    import_name_title: "实例名称", btn_import_do: "导入", importing: "正在导入...", error_import: "导入错误", import_partial: "部分文件下载失败",
    tab_play: "游戏", tab_instances: "实例", tab_catalog: "目录", tab_accounts: "账户", tab_settings: "设置",
    play_title: "游戏", btn_launch: "启动游戏", btn_launch_kill: "关闭游戏",
    instances_title: "实例", btn_create: "+ 创建", btn_import_mrpack: "导入 .mrpack", btn_import_zip_cf: "导入 CF .zip", btn_import_zip_prism: "导入 Prism .zip",
    catalog_title: "目录", cat_search: "搜索...", cat_mods: "模组", cat_resourcepacks: "资源包", cat_shaders: "光影", cat_worlds: "地图 (CF)", cat_datapacks: "数据包", cat_modpacks: "整合包",
    btn_prev: "上一页", btn_next: "下一页", page_info: "页",
    accounts_title: "账户", acc_offline: "离线", acc_nick: "昵称 (3-16字符)", btn_add: "添加", acc_email: "邮箱 / 登录", acc_pass: "密码", btn_login: "登录", btn_ms_login: "微软登录",
    settings_title: "设置", set_lang: "语言", set_theme: "主题", theme_dark: "深色", theme_light: "浅色", set_java: "Java路径 (空=自动)",
    set_repair_title: "修复文件", set_repair_desc: "如果缺少声音、主菜单背景或语言，请点击按钮。", btn_repair_assets: "修复资源",
    modal_create_title: "创建实例", modal_name: "名称", modal_version: "Minecraft版本", modal_loader: "模组加载器", modal_loader_ver: "加载器版本",
    btn_cancel: "取消", btn_create_do: "创建", btn_save: "保存", btn_delete: "删除", btn_install: "安装", btn_manage_mods: "管理内容",
    modal_icon: "图标 (表情或URL)", modal_group: "分组", modal_mc_version: "Minecraft版本", modal_ram: "内存 (最小/最大 MB)", modal_java: "Java路径 (空=全局)", modal_jvm: "JVM参数", modal_notes: "备注", btn_open_folder: "打开游戏文件夹", btn_export_mrpack: "导出为 .mrpack", btn_export_zip: "导出为 .zip",
    modal_mods_title: "已安装内容", btn_open_mods_folder: "打开文件夹", drag_drop_hint: "拖放文件到此处安装",
    confirm_title: "你确定吗？", no_instances: "暂无实例", no_accounts: "暂无账户", nothing_found: "未找到", no_mods: "未安装内容",
    searching: "搜索中...", error_offline_nick: "错误：仅限英文字母和数字 (3-16字符)", error_ely: "Ely.by错误", error_ms: "微软错误",
    inst_deleted: "实例已删除", inst_created: "实例已创建", inst_imported: "实例已导入", settings_saved: "设置已保存", acc_added: "账户已添加",
    success_inst: "安装成功!", error_inst: "错误", success_del: "已删除!", error_del: "删除错误", error_launch: "启动错误", success_export: "已导出!",
    log_game_closed: "游戏已关闭。", log_game_launched: "游戏已启动!", log_launching: "启动中...", log_error: "错误: ",
    err_world_cf: "地图仅在 CurseForge 中", err_select_inst: "选择实例", err_select_acc: "选择账户", err_enter_name: "输入名称",
    mods_enabled: "已启用", mods_disabled: "已禁用", warning_change_version: "警告：更改版本可能会破坏模组！",
    crash_title: "游戏崩溃", crash_reason: "原因", crash_unknown: "出了点问题...", btn_open_log: "打开日志", btn_close: "关闭",
    err_acc_exists: "该名称的账户已存在！", downloading_dep: "正在下载依赖...",
    type_java: "Java版", type_bedrock: "基岩版 (即将推出...)", auto_select: "自动 (推荐)", installing_loader: "正在安装模组加载器..."
  },
  ja: {
    btn_ely_login: "Ely.by でログイン", ely_browser_hint: "ブラウザでログインを完了してください。もう一度押すとキャンセルします。",
    import_name_title: "インスタンス名", btn_import_do: "インポート", importing: "インポート中...", error_import: "インポートエラー", import_partial: "一部のファイルをダウンロードできませんでした",
    tab_play: "プレイ", tab_instances: "インスタンス", tab_catalog: "カタログ", tab_accounts: "アカウント", tab_settings: "設定",
    play_title: "プレイ", btn_launch: "Minecraftを起動", btn_launch_kill: "ゲームを閉じる",
    instances_title: "インスタンス", btn_create: "+ 作成", btn_import_mrpack: ".mrpackをインポート", btn_import_zip_cf: "CF .zipをインポート", btn_import_zip_prism: "Prism .zipをインポート",
    catalog_title: "カタログ", cat_search: "検索...", cat_mods: "MOD", cat_resourcepacks: "リソースパック", cat_shaders: "シェーダー", cat_worlds: "ワールド (CF)", cat_datapacks: "データパック", cat_modpacks: "MODパック",
    btn_prev: "前へ", btn_next: "次へ", page_info: "ページ",
    accounts_title: "アカウント", acc_offline: "オフライン", acc_nick: "ニックネーム (3-16文字)", btn_add: "追加", acc_email: "メール / ログイン", acc_pass: "パスワード", btn_login: "ログイン", btn_ms_login: "Microsoftでログイン",
    settings_title: "設定", set_lang: "言語", set_theme: "テーマ", theme_dark: "ダーク", theme_light: "ライト", set_java: "Javaパス (空=自動)",
    set_repair_title: "ファイル修復", set_repair_desc: "サウンド、メインメニューの背景、言語が欠けている場合はボタンを押してください。", btn_repair_assets: "アセットを修復",
    modal_create_title: "インスタンス作成", modal_name: "名前", modal_version: "Minecraftバージョン", modal_loader: "MODローダー", modal_loader_ver: "ローダーバージョン",
    btn_cancel: "キャンセル", btn_create_do: "作成", btn_save: "保存", btn_delete: "削除", btn_install: "インストール", btn_manage_mods: "コンテンツ管理",
    modal_icon: "アイコン (絵文字またはURL)", modal_group: "グループ", modal_mc_version: "Minecraftバージョン", modal_ram: "RAM (最小/最大 MB)", modal_java: "Javaパス (空=グローバル)", modal_jvm: "JVM引数", modal_notes: "メモ", btn_open_folder: "ゲームフォルダを開く", btn_export_mrpack: ".mrpackにエクスポート", btn_export_zip: ".zipにエクスポート",
    modal_mods_title: "インストール済みコンテンツ", btn_open_mods_folder: "フォルダを開く", drag_drop_hint: "ここにファイルをドラッグ＆ドロップしてインストール",
    confirm_title: "よろしいですか？", no_instances: "インスタンスがありません", no_accounts: "アカウントがありません", nothing_found: "見つかりません", no_mods: "コンテンツがありません",
    searching: "検索中...", error_offline_nick: "エラー: 英数字のみ (3-16文字)", error_ely: "Ely.byエラー", error_ms: "Microsoftエラー",
    inst_deleted: "インスタンスを削除しました", inst_created: "インスタンスを作成しました", inst_imported: "インスタンスをインポートしました", settings_saved: "設定を保存しました", acc_added: "アカウントを追加しました",
    success_inst: "インストール完了!", error_inst: "エラー", success_del: "削除しました!", error_del: "削除エラー", error_launch: "起動エラー", success_export: "エクスポートしました!",
    log_game_closed: "ゲームが閉じられました。", log_game_launched: "ゲームが起動しました!", log_launching: "起動中...", log_error: "エラー: ",
    err_world_cf: "ワールドはCurseForgeのみ", err_select_inst: "インスタンスを選択", err_select_acc: "アカウントを選択", err_enter_name: "名前を入力",
    mods_enabled: "有効", mods_disabled: "無効", warning_change_version: "警告：バージョンを変更するとMODが壊れる可能性があります！",
    crash_title: "ゲームがクラッシュしました", crash_reason: "理由", crash_unknown: "何かがうまくいきませんでした...", btn_open_log: "ログを開く", btn_close: "閉じる",
    err_acc_exists: "その名前のアカウントは既に存在します！", downloading_dep: "依存関係をダウンロード中...",
    type_java: "Java版", type_bedrock: "Bedrock版 (近日公開予定...)", auto_select: "自動 (推奨)", installing_loader: "MODローダーをインストール中..."
  },
  uk: {
    btn_ely_login: "Увійти через Ely.by", ely_browser_hint: "Завершіть вхід у браузері. Натисніть кнопку ще раз, щоб скасувати.",
    import_name_title: "Назва збірки", btn_import_do: "Імпортувати", importing: "Імпорт...", error_import: "Помилка імпорту", import_partial: "Частину файлів не вдалося завантажити",
    tab_play: "Грати", tab_instances: "Збірки", tab_catalog: "Каталог", tab_accounts: "Акаунти", tab_settings: "Налаштування",
    play_title: "Грати", btn_launch: "Запустити Minecraft", btn_launch_kill: "Закрити гру",
    instances_title: "Збірки", btn_create: "+ Створити", btn_import_mrpack: "Імпорт .mrpack", btn_import_zip_cf: "Імпорт CF .zip", btn_import_zip_prism: "Імпорт Prism .zip",
    catalog_title: "Каталог", cat_search: "Пошук...", cat_mods: "Моди", cat_resourcepacks: "Ресурспаки", cat_shaders: "Шейдери", cat_worlds: "Карти (CF)", cat_datapacks: "Датапаки", cat_modpacks: "Збірки",
    btn_prev: "Назад", btn_next: "Вперед", page_info: "Стор.",
    accounts_title: "Акаунти", acc_offline: "Офлайн", acc_nick: "Нік (3-16 символів)", btn_add: "Додати", acc_email: "Email / логін", acc_pass: "Пароль", btn_login: "Увійти", btn_ms_login: "Увійти через Microsoft",
    settings_title: "Налаштування", set_lang: "Мова", set_theme: "Тема", theme_dark: "Темна", theme_light: "Світла", set_java: "Java path (порожньо = авто)",
    set_repair_title: "Відновлення файлів", set_repair_desc: "Якщо зникли звуки, фон головного меню або мова — натисни кнопку.", btn_repair_assets: "Відновити ассети",
    modal_create_title: "Створення збірки", modal_name: "Назва", modal_version: "Версія Minecraft", modal_loader: "Завантажувач модів", modal_loader_ver: "Версія завантажувача",
    btn_cancel: "Скасувати", btn_create_do: "Створити", btn_save: "Зберегти", btn_delete: "Видалити", btn_install: "Встановити", btn_manage_mods: "Управління контентом",
    modal_icon: "Іконка (Emoji або URL)", modal_group: "Група", modal_mc_version: "Версія Minecraft", modal_ram: "ОЗУ (Мін / Макс MB)", modal_java: "Java path (порожньо = глобальний)", modal_jvm: "JVM аргументи", modal_notes: "Нотатки", btn_open_folder: "Відкрити папку гри", btn_export_mrpack: "Експорт в .mrpack", btn_export_zip: "Експорт в .zip",
    modal_mods_title: "Встановлений контент", btn_open_mods_folder: "Відкрити папку", drag_drop_hint: "Перетягніть файли сюди для встановлення",
    confirm_title: "Ви впевнені?", no_instances: "Збірок поки немає", no_accounts: "Немає акаунтів", nothing_found: "Нічого не знайдено", no_mods: "Контент не встановлено",
    searching: "Пошук...", error_offline_nick: "Помилка: тільки англійські літери та цифри (3-16 символів)", error_ely: "Помилка Ely.by", error_ms: "Помилка Microsoft",
    inst_deleted: "Збірку видалено", inst_created: "Збірку створено", inst_imported: "Збірку імпортовано", settings_saved: "Налаштування збережено", acc_added: "Акаунт додано",
    success_inst: "Встановлено!", error_inst: "Помилка", success_del: "Видалено!", error_del: "Помилка видалення", error_launch: "Помилка запуску", success_export: "Експортовано!",
    log_game_closed: "Гру закрито.", log_game_launched: "Гру запущено!", log_launching: "Запуск...", log_error: "Помилка: ",
    err_world_cf: "Карти лише в CurseForge", err_select_inst: "Обери збірку", err_select_acc: "Обери акаунт", err_enter_name: "Введи назву",
    mods_enabled: "Увімкнено", mods_disabled: "Вимкнено", warning_change_version: "Увага: зміна версії може зламати моди!",
    crash_title: "Гра вилетіла", crash_reason: "Причина", crash_unknown: "Щось пішло не так...", btn_open_log: "Відкрити лог", btn_close: "Закрити",
    err_acc_exists: "Акаунт з таким ім'ям вже існує!", downloading_dep: "Завантаження залежності...",
    type_java: "Java Edition", type_bedrock: "Bedrock Edition (Буде доступно в майбутньому...)", auto_select: "Авто (Рекомендовано)", installing_loader: "Встановлення завантажувача модів..."
  },
  es: {
    btn_ely_login: "Iniciar sesión con Ely.by", ely_browser_hint: "Termina el inicio de sesión en el navegador. Pulsa de nuevo para cancelar.",
    import_name_title: "Nombre de la instancia", btn_import_do: "Importar", importing: "Importando...", error_import: "Error de importación", import_partial: "No se pudieron descargar algunos archivos",
    tab_play: "Jugar", tab_instances: "Instancias", tab_catalog: "Catálogo", tab_accounts: "Cuentas", tab_settings: "Ajustes",
    play_title: "Jugar", btn_launch: "Iniciar Minecraft", btn_launch_kill: "Cerrar Juego",
    instances_title: "Instancias", btn_create: "+ Crear", btn_import_mrpack: "Importar .mrpack", btn_import_zip_cf: "Importar CF .zip", btn_import_zip_prism: "Importar Prism .zip",
    catalog_title: "Catálogo", cat_search: "Buscar...", cat_mods: "Mods", cat_resourcepacks: "Paquetes de Recursos", cat_shaders: "Shaders", cat_worlds: "Mundos (CF)", cat_datapacks: "Datapacks", cat_modpacks: "Modpacks",
    btn_prev: "Anterior", btn_next: "Siguiente", page_info: "Pág.",
    accounts_title: "Cuentas", acc_offline: "Sin conexión", acc_nick: "Apodo (3-16 caracteres)", btn_add: "Añadir", acc_email: "Correo / usuario", acc_pass: "Contraseña", btn_login: "Iniciar sesión", btn_ms_login: "Iniciar con Microsoft",
    settings_title: "Ajustes", set_lang: "Idioma", set_theme: "Tema", theme_dark: "Oscuro", theme_light: "Claro", set_java: "Ruta de Java (vacío = auto)",
    set_repair_title: "Reparar archivos", set_repair_desc: "Si faltan sonidos, fondo del menú principal o idioma, presiona el botón.", btn_repair_assets: "Reparar assets",
    modal_create_title: "Crear Instancia", modal_name: "Nombre", modal_version: "Versión de Minecraft", modal_loader: "Cargador de Mods", modal_loader_ver: "Versión del Cargador",
    btn_cancel: "Cancelar", btn_create_do: "Crear", btn_save: "Guardar", btn_delete: "Eliminar", btn_install: "Instalar", btn_manage_mods: "Gestionar Contenido",
    modal_icon: "Icono (Emoji o URL)", modal_group: "Grupo", modal_mc_version: "Versión de Minecraft", modal_ram: "RAM (Mín / Máx MB)", modal_java: "Ruta de Java (vacío = global)", modal_jvm: "Argumentos JVM", modal_notes: "Notas", btn_open_folder: "Abrir carpeta del juego", btn_export_mrpack: "Exportar a .mrpack", btn_export_zip: "Exportar a .zip",
    modal_mods_title: "Contenido Instalado", btn_open_mods_folder: "Abrir Carpeta", drag_drop_hint: "Arrastra y suelta archivos aquí para instalar",
    confirm_title: "¿Estás seguro?", no_instances: "No hay instancias", no_accounts: "No hay cuentas", nothing_found: "Nada encontrado", no_mods: "No hay contenido",
    searching: "Buscando...", error_offline_nick: "Error: solo letras y números (3-16 caracteres)", error_ely: "Error de Ely.by", error_ms: "Error de Microsoft",
    inst_deleted: "Instancia eliminada", inst_created: "Instancia creada", inst_imported: "Instancia importada", settings_saved: "Ajustes guardados", acc_added: "Cuenta añadida",
    success_inst: "¡Instalado!", error_inst: "Error", success_del: "¡Eliminado!", error_del: "Error al eliminar", error_launch: "Error al iniciar", success_export: "¡Exportado!",
    log_game_closed: "Juego cerrado.", log_game_launched: "¡Juego iniciado!", log_launching: "Iniciando...", log_error: "Error: ",
    err_world_cf: "Mundos solo en CurseForge", err_select_inst: "Selecciona instancia", err_select_acc: "Selecciona cuenta", err_enter_name: "Ingresa nombre",
    mods_enabled: "Activado", mods_disabled: "Desactivado", warning_change_version: "¡Advertencia: cambiar la versión puede romper los mods!",
    crash_title: "El juego se ha cerrado", crash_reason: "Razón", crash_unknown: "Algo salió mal...", btn_open_log: "Abrir registro", btn_close: "Cerrar",
    err_acc_exists: "¡La cuenta con este nombre ya existe!", downloading_dep: "Descargando dependencia...",
    type_java: "Java Edition", type_bedrock: "Bedrock Edition (Próximamente...)", auto_select: "Auto (Recomendado)", installing_loader: "Instalando cargador de mods..."
  }
};

let currentLang = localStorage.getItem('lang') || 'en';
let accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
let currentAccount = localStorage.getItem('currentAccount') !== null ? parseInt(localStorage.getItem('currentAccount')) : null;
let editingInstance = null;
let catalogPage = 1;
let catalogTotal = 0;
const PAGE_SIZE = 20;
let isGameRunning = false;
let confirmCallback = null;
let searchRequestId = 0;
let currentDetailData = null;
let isSearching = false;

if (currentAccount !== null && currentAccount >= accounts.length) currentAccount = null;

function t(key) {
  return translations[currentLang][key] || translations['en'][key] || key;
}

function applyTranslations() {
  $$('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key.startsWith('[placeholder]')) {
      const k = key.replace('[placeholder]', '');
      el.placeholder = t(k);
    } else {
      el.textContent = t(key);
    }
  });
}

function showToast(msg, type = 'success') {
  const container = $('#toast-container');
  const div = document.createElement('div');
  div.className = 'toast ' + type;
  div.textContent = msg;
  container.appendChild(div);
  setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 300); }, 3000);
}

function showConfirm(title, desc, btnText, callback) {
  $('#confirm-title').textContent = title;
  $('#confirm-desc').textContent = desc;
  $('#confirm-ok').textContent = btnText;
  $('#modal-confirm').style.display = 'flex';
  confirmCallback = callback;
}
$('#confirm-cancel').onclick = () => { $('#modal-confirm').style.display = 'none'; confirmCallback = null; };
$('#confirm-ok').onclick = () => { if (confirmCallback) confirmCallback(); $('#modal-confirm').style.display = 'none'; confirmCallback = null; };

function applyTheme(theme) {
  document.body.className = theme;
  localStorage.setItem('theme', theme);
  $('#set-theme').value = theme;
}

$('#set-theme').onchange = (e) => applyTheme(e.target.value);
$('#set-lang').onchange = (e) => {
  currentLang = e.target.value;
  localStorage.setItem('lang', currentLang);
  applyTranslations();
  refreshInstances();
  renderAccounts();
  doSearch();
  loadRepairVersions();
};

$$('.sidebar button').forEach((b) => {
  b.onclick = () => {
    $$('.sidebar button').forEach((x) => x.classList.remove('active'));
    $$('.tab').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    $('#tab-' + b.dataset.tab).classList.add('active');
    if (b.dataset.tab === 'instances') refreshInstances();
    if (b.dataset.tab === 'accounts') renderAccounts();
    if (b.dataset.tab === 'catalog') { catalogPage = 1; doSearch(true); }
  };
});

$('#btn-min').onclick = () => api.minimize();
$('#btn-close').onclick = () => api.close();

async function loadVersions() {
  const res = await api.versions.list();
  if (res.ok) {
    res.versions.sort((a, b) => new Date(b.releaseTime) - new Date(a.releaseTime));
    const selCreate = $('#c-mc');
    const selEdit = $('#m-mc');
    res.versions.forEach(v => {
      const opt1 = document.createElement('option');
      opt1.value = v.id; opt1.textContent = `${v.id} (${v.type})`;
      selCreate.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = v.id; opt2.textContent = `${v.id} (${v.type})`;
      selEdit.appendChild(opt2);
    });
  }
}
loadVersions();

async function loadRepairVersions() {
  const res = await api.versions.list();
  if (!res.ok) return;
  const sel = $('#repair-version');
  if (!sel) return;
  const installed = res.versions.filter(v => v.type === 'release').slice(0, 30);
  sel.innerHTML = installed.map(v => `<option value="${v.id}">${v.id}</option>`).join('');
}
loadRepairVersions();

const btnRepair = document.getElementById('btn-repair-assets');
if (btnRepair) {
  btnRepair.onclick = async () => {
    const v = document.getElementById('repair-version').value;
    if (!v) return;
    btnRepair.disabled = true;
    const prev = btnRepair.textContent;
    btnRepair.textContent = '...';
    const res = await api.versions.repairAssets(v);
    btnRepair.disabled = false;
    btnRepair.textContent = prev;
    if (res.ok) showToast(`Assets OK (${res.downloaded} downloaded, ${res.alreadyPresent} already)`, 'success');
    else showToast(`Assets: ${res.fails || 0} failed`, 'error');
  };
}

async function loadLoaderVersions(loader, mcVersion, targetSelect) {
  targetSelect.innerHTML = `<option value="auto">${t('auto_select')}</option>`;
  if (loader === 'vanilla' || loader === 'liteloader' || !mcVersion) return;

  try {
    const res = await api.loader.versions(loader, mcVersion);
    (res.versions || []).forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      targetSelect.appendChild(opt);
    });
  } catch (e) {
    console.error('Failed to load loader versions');
  }
}

$('#c-loader').onchange = (e) => {
  loadLoaderVersions(e.target.value, $('#c-mc').value, $('#c-loader-ver'));
};
$('#c-mc').addEventListener('change', () => {
  loadLoaderVersions($('#c-loader').value, $('#c-mc').value, $('#c-loader-ver'));
});

api.onProgress((data) => {
  const toast = $('#progress-toast');
  const text = $('#p-text');
  const bar = $('#p-bar-fill');
  if (typeof data === 'string') { text.textContent = data; bar.style.width = '100%'; }
  else {
    text.textContent = data.text.replace('Installing mod loader...', t('installing_loader')).replace('Downloading dependency...', t('downloading_dep'));
    bar.style.width = (data.percent || 0) + '%';
  }
  toast.classList.add('show');
  if (data.percent === 100 || data.text?.includes('Done') || data.text?.includes('Готово') || data.text?.includes('в порядке')) setTimeout(() => { toast.classList.remove('show'); bar.style.width = '0%'; }, 3000);
});

function renderAccounts() {
  const list = $('#accounts-list');
  list.innerHTML = accounts.map((a, i) => `
    <div class="item">
      <div class="info"><strong>${a.name}</strong><small>${a.type}</small></div>
      <button onclick="removeAccount(${i})">${icon('x')}</button>
    </div>
  `).join('') || `<p style="color:#888">${t('no_accounts')}</p>`;
  refreshAccountSelectors();
}
window.removeAccount = (i) => {
  accounts.splice(i, 1);
  if (currentAccount === i) currentAccount = accounts.length > 0 ? 0 : null;
  else if (currentAccount > i) currentAccount--;
  localStorage.setItem('accounts', JSON.stringify(accounts));
  if (currentAccount !== null) localStorage.setItem('currentAccount', currentAccount);
  else localStorage.removeItem('currentAccount');
  renderAccounts();
};
function addAccount(acc) {
  const existing = accounts.findIndex(a => a.name.toLowerCase() === acc.name.toLowerCase() && a.type === acc.type);
  if (existing !== -1) {
    if (acc.type === 'microsoft') {
      accounts[existing] = acc;
      localStorage.setItem('accounts', JSON.stringify(accounts));
      renderAccounts(); showToast(t('acc_added'));
      return;
    }
    showToast(t('err_acc_exists'), 'error');
    return;
  }
  accounts.push(acc);
  if (currentAccount === null) {
    currentAccount = 0;
    localStorage.setItem('currentAccount', 0);
  }
  localStorage.setItem('accounts', JSON.stringify(accounts));
  renderAccounts(); showToast(t('acc_added'));
}

$('#btn-off').onclick = async () => {
  try { addAccount(await api.authOffline($('#off-nick').value.trim())); }
  catch (e) { showToast(t('error_offline_nick'), 'error'); }
};
let elyPending = false;
$('#btn-ely').onclick = async () => {
  if (elyPending) {
    api.cancelEly();
    return;
  }
  elyPending = true;
  showToast(t('ely_browser_hint'));
  try {
    const res = await api.authEly();
    if (res.ok) addAccount(res.account);
    else if (!res.cancelled) showToast(t('error_ely') + ': ' + res.error, 'error');
  } catch (e) {
    showToast(t('error_ely') + ': ' + e.message, 'error');
  } finally {
    elyPending = false;
  }
};
$('#btn-ms').onclick = async () => {
  const btn = $('#btn-ms');
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    const res = await api.authMicrosoft();
    if (res.ok) addAccount(res.account);
    else if (!res.cancelled) showToast(t('error_ms') + ': ' + res.error, 'error');
  } catch (e) {
    showToast(t('error_ms') + ': ' + e.message, 'error');
  } finally {
    btn.disabled = false;
  }
};

async function refreshInstances() {
  const list = await api.instances.list();
  const el = $('#instances-list');
  if (list.length === 0) {
    el.innerHTML = `<p style="color:#888; grid-column: 1/-1">${t('no_instances')}</p>`;
    refreshInstanceSelectors(list); return;
  }
  const groups = {};
  list.forEach(i => { const g = i.group || 'No group'; if (!groups[g]) groups[g] = []; groups[g].push(i); });

  let html = '';
  for (const [groupName, insts] of Object.entries(groups)) {
    html += `<h3 style="grid-column: 1/-1; font-size:14px; margin-top:16px; margin-bottom:-4px; opacity:0.7">${groupName}</h3>`;
    html += insts.map((i) => {
      let iconHtml = i.icon.startsWith('http') ? `<img src="${i.icon}">` : (i.icon === 'default' ? icon('package', 28) : i.icon);
      return `
        <div class="item">
          <div class="inst-icon">${iconHtml}</div>
          <div class="info"><strong>${i.name}</strong><small>${i.mcVersion} • ${i.loader} • ${i.maxMemory}MB • ${i.type === 'bedrock' ? 'Bedrock' : 'Java'}</small></div>
          <button onclick="openSettings('${i.name}')">${icon('settings')}</button>
          <button onclick="deleteInst('${i.name}')">${icon('x')}</button>
        </div>`;
    }).join('');
  }
  el.innerHTML = html; refreshInstanceSelectors(list);
}

window.deleteInst = (name) => {
  showConfirm(t('confirm_title'), `Delete "${name}"?`, t('btn_delete'), async () => {
    await api.instances.delete(name); refreshInstances(); showToast(t('inst_deleted'));
  });
};

window.openSettings = async (name) => {
  const meta = (await api.instances.list()).find((i) => i.name === name);
  if (!meta) return;
  editingInstance = name;
  $('#modal-title').textContent = t('modal_create_title') + ': ' + name;
  $('#m-icon').value = meta.icon || 'default';
  $('#m-group').value = meta.group || 'No group';
  $('#m-mc').value = meta.mcVersion;
  $('#m-loader').value = meta.loader;
  $('#m-min-ram').value = meta.minMemory;
  $('#m-max-ram').value = meta.maxMemory;
  $('#m-java').value = meta.javaPath;
  $('#m-jvm').value = meta.jvmArgs;
  $('#m-notes').value = meta.notes;
  $('#modal-inst').style.display = 'flex';

  loadLoaderVersions(meta.loader, meta.mcVersion, $('#m-loader-ver')).then(() => {
    $('#m-loader-ver').value = meta.loaderVersion || 'auto';
  });

  $('#m-open-folder').onclick = () => api.shell.openFolder(name);

  $('#btn-open-mods-modal').onclick = () => {
    $('#modal-inst').style.display = 'none';
    openModsManager(name);
  };

  $('#m-export-mrpack').onclick = async () => {
    const res = await api.export.mrpack(name);
    if (res.ok) showToast(t('success_export'));
    else showToast(res.error, 'error');
  };

  $('#m-export-zip').onclick = async () => {
    const res = await api.export.zip(name);
    if (res.ok) showToast(t('success_export'));
    else showToast(res.error, 'error');
  };
};

$('#m-loader').onchange = (e) => {
  loadLoaderVersions(e.target.value, $('#m-mc').value, $('#m-loader-ver'));
};
$('#m-mc').addEventListener('change', () => {
  loadLoaderVersions($('#m-loader').value, $('#m-mc').value, $('#m-loader-ver'));
});

$('#modal-cancel').onclick = () => { $('#modal-inst').style.display = 'none'; };
$('#modal-save').onclick = async () => {
  const oldMeta = (await api.instances.list()).find((i) => i.name === editingInstance);
  const newMc = $('#m-mc').value;
  const newLoader = $('#m-loader').value;
  const newLoaderVer = $('#m-loader-ver').value;

  if (oldMeta.mcVersion !== newMc || oldMeta.loader !== newLoader || oldMeta.loaderVersion !== newLoaderVer) {
    showConfirm(t('confirm_title'), t('warning_change_version'), t('btn_save'), async () => {
      $('#progress-toast').classList.add('show');
      await api.instances.update(editingInstance, {
        icon: $('#m-icon').value.trim() || 'default',
        group: $('#m-group').value.trim() || 'No group',
        mcVersion: newMc,
        loader: newLoader,
        loaderVersion: newLoaderVer,
        minMemory: +$('#m-min-ram').value || 1024,
        maxMemory: +$('#m-max-ram').value || 4096,
        javaPath: $('#m-java').value,
        jvmArgs: $('#m-jvm').value,
        notes: $('#m-notes').value
      });

      try {
        await api.versions.install(newMc);
        if (newLoader !== 'vanilla') {
          const lres = await api.loader.install({ loader: newLoader, mcVersion: newMc, instance: editingInstance, version: newLoaderVer });
          if (!lres.ok) throw new Error(lres.error);
        }
      } catch (e) { showToast('Download error: ' + e.message, 'error'); }

      $('#modal-inst').style.display = 'none';
      refreshInstances(); showToast(t('settings_saved'));
    });
  } else {
    await api.instances.update(editingInstance, {
      icon: $('#m-icon').value.trim() || 'default',
      group: $('#m-group').value.trim() || 'No group',
      mcVersion: newMc,
      loader: newLoader,
      loaderVersion: newLoaderVer,
      minMemory: +$('#m-min-ram').value || 1024,
      maxMemory: +$('#m-max-ram').value || 4096,
      javaPath: $('#m-java').value,
      jvmArgs: $('#m-jvm').value,
      notes: $('#m-notes').value
    });
    $('#modal-inst').style.display = 'none';
    refreshInstances(); showToast(t('settings_saved'));
  }
};

function openModsManager(instanceName) {
  editingInstance = instanceName;
  $('#modal-mods').style.display = 'flex';
  $('#modal-mods').dataset.inst = instanceName;
  loadLocalMods();

  $('#mods-filter-type').onchange = loadLocalMods;

  $('#btn-open-mods-folder').onclick = () => {
    api.shell.openInstanceMods(instanceName, $('#mods-filter-type').value);
  };
}

async function loadLocalMods() {
  const inst = $('#modal-mods').dataset.inst;
  const type = $('#mods-filter-type').value;
  const list = await api.mods.listLocal(inst, type);
  const container = $('#mods-list');

  if (list.length === 0) {
    container.innerHTML = `<p style="color:#888; grid-column: 1/-1">${t('no_mods')}</p>`;
    return;
  }

  container.innerHTML = list.map((m) => `
    <div class="item" style="padding: 12px;">
      <div class="info">
        <strong>${m.name.replace('.disabled', '')}</strong>
        <small>${m.enabled ? t('mods_enabled') : t('mods_disabled')} • ${(m.size / 1024).toFixed(1)} KB</small>
      </div>
      <button onclick="toggleMod('${m.name}', '${type}')" title="Toggle">${m.enabled ? icon('pause') : icon('play')}</button>
      <button onclick="deleteMod('${m.name}', '${type}')" style="color: var(--danger);">${icon('x')}</button>
    </div>
  `).join('');
}

window.toggleMod = async (filename, type) => {
  const inst = $('#modal-mods').dataset.inst;
  await api.mods.toggleLocal(inst, filename, type);
  loadLocalMods();
};

window.deleteMod = (filename, type) => {
  const inst = $('#modal-mods').dataset.inst;
  showConfirm(t('confirm_title'), `Delete "${filename}"?`, t('btn_delete'), async () => {
    await api.mods.delete(inst, filename, type);
    loadLocalMods();
    showToast(t('success_del'));
  });
};

$('#modal-mods-close').onclick = () => {
  $('#modal-mods').style.display = 'none';
  $('#modal-inst').style.display = 'flex';
  refreshInstances();
};

const dropZone = $('#drop-zone');
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const type = $('#mods-filter-type').value;
  const inst = $('#modal-mods').dataset.inst;
  const files = Array.from(e.dataTransfer.files);

  for (const file of files) {
    const res = await api.mods.importLocal(inst, file.path, type);
    if (res.ok) showToast(t('success_inst'));
    else showToast('Error: ' + res.error, 'error');
  }
  loadLocalMods();
});

$('#btn-new-inst').onclick = () => { $('#c-name').value = ''; $('#modal-create').style.display = 'flex'; };
$('#c-submit').onclick = async () => {
  const name = $('#c-name').value.trim();
  const mcVersion = $('#c-mc').value;
  const loader = $('#c-loader').value;
  const loaderVer = $('#c-loader-ver').value;
  const type = $('#c-type').value;
  if (!name) return showToast(t('err_enter_name'), 'error');
  if (type === 'bedrock') return showToast(t('type_bedrock'), 'error');

  $('#modal-create').style.display = 'none';
  $('#progress-toast').classList.add('show');
  try {
    await api.instances.create({ name, mcVersion, loader, type, loaderVersion: loaderVer });
    const vres = await api.versions.install(mcVersion);
    if (!vres.ok) throw new Error(vres.error);

    if (loader !== 'vanilla') {
      $('#p-text').textContent = `Installing ${loader}...`;
      const lres = await api.loader.install({ loader, mcVersion, instance: name, version: loaderVer });
      if (!lres.ok) throw new Error(lres.error);
    }
    refreshInstances(); showToast(t('inst_created'));
  } catch (e) { showToast(t('error_inst') + ': ' + e.message, 'error'); }
};

function askImportName(defaultName) {
  return new Promise((resolve) => {
    const modal = $('#modal-import-name');
    const input = $('#import-name');
    const finish = (value) => {
      modal.style.display = 'none';
      input.onkeydown = null;
      $('#import-name-ok').onclick = null;
      $('#import-name-cancel').onclick = null;
      resolve(value);
    };
    input.value = defaultName;
    modal.style.display = 'flex';
    input.focus();
    input.select();
    $('#import-name-ok').onclick = () => finish(input.value.trim());
    $('#import-name-cancel').onclick = () => finish(null);
    input.onkeydown = (e) => {
      if (e.key === 'Enter') finish(input.value.trim());
      else if (e.key === 'Escape') finish(null);
    };
  });
}

let importing = false;

async function runImport(filters, kind) {
  if (importing) return;
  const file = await api.dialog.openFile(filters);
  if (!file) return;
  const defaultName = await api.import.suggestName(file, kind);
  const name = await askImportName(defaultName);
  if (!name) return;

  importing = true;
  $('#p-text').textContent = t('importing');
  $('#p-bar-fill').style.width = '0%';
  $('#progress-toast').classList.add('show');
  try {
    const res = kind === 'mrpack' ? await api.mrpack.import(file, name) : await api.zip.import(file, name, kind);
    if (!res || !res.ok) throw new Error((res && res.error) || 'Unknown error');
    await refreshInstances();
    showToast(t('inst_imported'));
    if (res.failed) showToast(t('import_partial') + ': ' + res.failed, 'error');
  } catch (e) {
    showToast(t('error_import') + ': ' + e.message, 'error');
  } finally {
    importing = false;
    setTimeout(() => {
      $('#progress-toast').classList.remove('show');
      $('#p-bar-fill').style.width = '0%';
    }, 1500);
  }
}

$('#btn-import-mrpack').onclick = () => runImport([{ name: 'Modrinth', extensions: ['mrpack'] }], 'mrpack');
$('#btn-import-zip-cf').onclick = () => runImport([{ name: 'CurseForge', extensions: ['zip'] }], 'curseforge');
$('#btn-import-zip-prism').onclick = () => runImport([{ name: 'Prism', extensions: ['zip'] }], 'prism');

let searchTimeout = null;
$('#cat-q').addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { catalogPage = 1; doSearch(); }, 500); });
$('#cat-type').onchange = () => { catalogPage = 1; doSearch(); };
$('#cat-source').onchange = () => { catalogPage = 1; doSearch(); };
$('#cat-instance').onchange = async () => { catalogPage = 1; doSearch(); };

$('#btn-prev-page').onclick = () => { if (!isSearching && catalogPage > 1) { catalogPage--; doSearch(); } };
$('#btn-next-page').onclick = () => { if (!isSearching && catalogPage * PAGE_SIZE < catalogTotal) { catalogPage++; doSearch(); } };

async function doSearch(autoMode = false) {
  if (isSearching) return;
  const reqId = ++searchRequestId;
  isSearching = true;

  const q = $('#cat-q').value;
  const type = $('#cat-type').value;
  const source = $('#cat-source').value;
  const inst = $('#cat-instance').value;
  const instMeta = (await api.instances.list()).find((i) => i.name === inst);

  if (!autoMode && !q && catalogPage === 1 && type === 'mod') {
    $('#catalog-results').innerHTML = `<p style="color:#888; grid-column: 1/-1">${t('searching')}</p>`;
  }

  let data;
  try {
    if (source === 'modrinth') {
      if (type === 'world') {
        if (reqId !== searchRequestId) { isSearching = false; return; }
        $('#catalog-results').innerHTML = `<p style="color:#888; grid-column: 1/-1">${t('err_world_cf')}</p>`;
        $('#cat-pagination').style.display = 'none';
        isSearching = false;
        return;
      }
      data = await api.modrinth.search(q, type, instMeta?.loader, instMeta?.mcVersion, catalogPage, PAGE_SIZE);
    } else {
      data = await api.curseforge.search(q, type, instMeta?.mcVersion, instMeta?.loader, catalogPage, PAGE_SIZE);
    }
  } catch (e) {
    if (reqId !== searchRequestId) { isSearching = false; return; }
    $('#catalog-results').innerHTML = `<p style="color:#f88; grid-column: 1/-1">${e.message}</p>`;
    isSearching = false;
    return;
  }

  if (reqId !== searchRequestId) { isSearching = false; return; }

  catalogTotal = data.total || 0;
  $('#cat-pagination').style.display = catalogTotal > PAGE_SIZE ? 'flex' : 'none';
  $('#page-info').textContent = `${t('page_info')} ${catalogPage}`;
  $('#btn-prev-page').disabled = catalogPage === 1;
  $('#btn-next-page').disabled = catalogPage * PAGE_SIZE >= catalogTotal;

  const installedIds = instMeta?.installedMods || {};
  const currentTypeIds = installedIds[type] || [];

  $('#catalog-results').innerHTML = data.items.map((r) => {
    const isInstalled = currentTypeIds.some(id => String(id) === String(r.id));
    const btnContent = isInstalled ? icon('x') : icon('plus');
    const btnClass = isInstalled ? 'circle-btn danger' : '';

    return `
    <div class="item">
      <div class="inst-icon">${r.icon ? `<img src="${r.icon}">` : icon('package', 28)}</div>
      <div class="info" onclick="openDetail('${r.id}','${source}','${type}')">
        <strong>${r.title}</strong>
        <small>${r.description || ''}</small>
      </div>
      <button id="btn-inst-${r.id}" class="${btnClass}" onclick="installRes('${r.id}','${source}','${type}', this)">${btnContent}</button>
    </div>
  `}).join('') || `<p style="color:#888; grid-column: 1/-1">${t('nothing_found')}</p>`;

  isSearching = false;
}

function parseMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/!\[.*?\]\((.*?)\)/g, '<img src="$1" style="max-width:100%; border-radius:8px; margin:10px 0;">')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color:var(--accent); text-decoration:none;">$1</a>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
    .replace(/\*(.*?)\*/gim, '<i>$1</i>')
    .replace(/\n/gim, '<br>');
}

window.openDetail = async (id, source, type) => {
  $('#modal-detail').style.display = 'flex';
  $('#detail-title').textContent = 'Loading...';
  $('#detail-desc').innerHTML = '';
  $('#detail-author').textContent = '';
  $('#detail-downloads').textContent = '';
  $('#detail-icon').innerHTML = icon('package', 40);
  $('#modal-detail-install').style.display = 'none';

  let data;
  try {
    if (source === 'modrinth') data = await api.modrinth.details(id);
    else data = await api.curseforge.details(id);
  } catch (e) {
    $('#detail-title').textContent = 'Error';
    $('#detail-desc').innerHTML = e.message;
    return;
  }

  currentDetailData = { id, source, type };

  if (source === 'modrinth') {
    $('#detail-title').textContent = data.title;
    $('#detail-author').textContent = `Author: ${data.author || 'Unknown'}`;
    $('#detail-downloads').textContent = `Downloads: ${data.downloads}`;
    $('#detail-desc').innerHTML = parseMarkdown(data.body || data.description);
    if (data.icon_url) $('#detail-icon').innerHTML = `<img src="${data.icon_url}">`;
  } else {
    $('#detail-title').textContent = data.name;
    $('#detail-author').textContent = `Author: ${data.authors ? data.authors[0].name : 'Unknown'}`;
    $('#detail-downloads').textContent = `Downloads: ${data.downloadCount}`;
    $('#detail-desc').innerHTML = parseMarkdown(data.summary || '');
    if (data.logo && data.logo.thumbnailUrl) $('#detail-icon').innerHTML = `<img src="${data.logo.thumbnailUrl}">`;
  }

  const inst = $('#cat-instance').value;
  const instMeta = (await api.instances.list()).find((i) => i.name === inst);
  const installedIds = instMeta?.installedMods || {};
  const currentTypeIds = installedIds[type] || [];

  const isInstalled = currentTypeIds.some(iid => String(iid) === String(id));

  if (isInstalled) {
    $('#modal-detail-install').textContent = t('btn_delete');
    $('#modal-detail-install').className = 'danger';
  } else {
    $('#modal-detail-install').textContent = t('btn_install');
    $('#modal-detail-install').className = 'primary';
  }
  $('#modal-detail-install').style.display = 'inline-flex';
};

$('#modal-detail-close').onclick = () => { $('#modal-detail').style.display = 'none'; };

$('#modal-detail-install').onclick = async () => {
  if (!currentDetailData) return;
  $('#modal-detail').style.display = 'none';

  const inst = $('#cat-instance').value;
  const instMeta = (await api.instances.list()).find((i) => i.name === inst);
  const installedIds = instMeta?.installedMods || {};
  const currentTypeIds = installedIds[currentDetailData.type] || [];
  const isInstalled = currentTypeIds.some(iid => String(iid) === String(currentDetailData.id));

  if (isInstalled) {
    const res = await api.mods.deleteByProjectId(inst, currentDetailData.id, currentDetailData.type);
    if (res.ok) {
      doSearch();
      showToast(t('success_del'));
    } else {
      showToast(t('error_del') + ': ' + res.error, 'error');
    }
  } else {
    installRes(currentDetailData.id, currentDetailData.source, currentDetailData.type);
  }
};

window.installRes = async (id, source, type, btnElement) => {
  const inst = $('#cat-instance').value;
  if (!inst) return showToast(t('err_select_inst'), 'error');
  const meta = (await api.instances.list()).find((i) => i.name === inst);
  const btn = btnElement || document.getElementById(`btn-inst-${id}`);

  const installedIds = meta?.installedMods || {};
  const currentTypeIds = installedIds[type] || [];
  const isInstalled = currentTypeIds.some(iid => String(iid) === String(id));

  if (btn) {
    if (isInstalled) {
      showConfirm(t('confirm_title'), `Delete this ${type}?`, t('btn_delete'), async () => {
        const res = await api.mods.deleteByProjectId(inst, id, type);
        if (res.ok) {
          btn.innerHTML = '+'; btn.className = '';
          btn.onclick = () => window.installRes(id, source, type, btn);
          doSearch();
          showToast(t('success_del'));
        } else {
          showToast(t('error_del') + ': ' + res.error, 'error');
        }
      });
      return;
    }

    btn.innerHTML = '<div class="spinner"></div>';
    btn.disabled = true;
    btn.className = 'circle-btn';
    btn.onclick = null;
  }

  try {
    let res;
    if (source === 'modrinth') res = await api.modrinth.install({ instance: inst, projectId: id, mcVersion: meta.mcVersion, loader: meta.loader, projectType: type });
    else res = await api.curseforge.install({ instance: inst, projectId: id, type, mcVersion: meta.mcVersion });
    if (res.ok === false) throw new Error(res.error);

    if (btn) {
      btn.innerHTML = icon('x');
      btn.className = 'circle-btn danger';
      btn.title = 'Delete';
      btn.disabled = false;
      btn.onclick = () => window.installRes(id, source, type, btn);
    }
    $('#progress-toast').classList.remove('show');
    doSearch();
    showToast(t('success_inst'));
  } catch (e) {
    if (btn) {
      btn.innerHTML = '+'; btn.className = ''; btn.disabled = false;
      btn.onclick = () => window.installRes(id, source, type, btn);
    }
    showToast(t('error_inst') + ': ' + e.message, 'error');
  }
};

const btnLaunch = $('#btn-launch');
const launchLog = $('#launch-log');

btnLaunch.onclick = async () => {
  if (isGameRunning) { await api.game.kill(); return; }
  if (currentAccount === null) return showToast(t('err_select_acc'), 'error');
  const instance = $('#play-instance').value;
  if (!instance) return showToast(t('err_select_inst'), 'error');

  launchLog.style.display = 'block';
  launchLog.className = '';
  launchLog.textContent = t('log_launching') + '\n';

  try {
    const res = await api.game.launch({ instance, account: accounts[currentAccount] });
    if (!res.ok) throw new Error(res.error);
    if (res.account) {
      accounts[currentAccount] = res.account;
      localStorage.setItem('accounts', JSON.stringify(accounts));
    }

    isGameRunning = true;
    btnLaunch.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:8px"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg> ' + t('btn_launch_kill');
    btnLaunch.className = 'primary big danger';
    launchLog.textContent += `PID: ${res.pid}\n` + t('log_game_launched');
  } catch (e) {
    launchLog.textContent += t('log_error') + e.message;
    launchLog.className = 'error-text';
    showToast(t('error_launch') + ': ' + e.message, 'error');
  }
};

api.onGameClosed((crashData) => {
  isGameRunning = false;
  btnLaunch.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:8px"><polygon points="5 3 19 12 5 21 5 3"/></svg> ' + t('btn_launch');
  btnLaunch.className = 'primary big';
  launchLog.textContent += '\n' + t('log_game_closed');
  launchLog.className = 'error-text';

  if (crashData && crashData.isCrash) {
    $('#crash-reason').textContent = crashData.reason || t('crash_unknown');
    $('#modal-crash').style.display = 'flex';
    $('#btn-crash-open-log').onclick = () => {
      api.shell.openLog($('#play-instance').value);
    };
  }
});

$('#btn-crash-close').onclick = () => { $('#modal-crash').style.display = 'none'; };

function refreshInstanceSelectors(list) {
  if (!list) return;
  const opts = list.map((i) => `<option value="${i.name}">${i.name} (${i.mcVersion}/${i.loader})</option>`).join('');
  $('#play-instance').innerHTML = opts || `<option value="">${t('no_instances')}</option>`;
  $('#cat-instance').innerHTML = opts || `<option value="">${t('no_instances')}</option>`;
}
function refreshAccountSelectors() {
  const opts = accounts.map((a, i) => `<option value="${i}" ${i === currentAccount ? 'selected' : ''}>${a.name}</option>`).join('');
  $('#play-account').innerHTML = opts || `<option value="">${t('no_accounts')}</option>`;
}
$('#play-account').onchange = (e) => {
  currentAccount = +e.target.value;
  localStorage.setItem('currentAccount', currentAccount);
};

(async () => {
  const cfg = await api.config.get();
  if (cfg.javaPath) $('#set-java').value = cfg.javaPath;
})();
$('#set-java').onchange = (e) => api.config.set({ javaPath: e.target.value });

injectIcons();
applyTranslations();
applyTheme(localStorage.getItem('theme') || 'theme-dark');
$('#set-lang').value = currentLang;
refreshInstances();
renderAccounts();