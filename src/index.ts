import { Command, Option } from "commander";
const { inspectFiles, translate } = require("./util.ts");

const program = new Command();
const DEFAULT_FILE_FORMAT = "{key}.i18n.ts";
const DEFAULT_KEYS = ["zh", "en"];

const useOption = new Option("-u,--use <dictionary>", "选择使用字典")
  .default("youdao")
  .choices(["baidu", "youdao"]);

program.version(require("../package.json").version);
program.enablePositionalOptions();
program
  .command("diff <source>")
  .description(
    "根据传入的文档目录，主动检查中文翻译文件存在，英文翻译文件缺失的翻译项"
  )
  .passThroughOptions()
  .addOption(useOption)
  .option(
    "-f, --format [format]",
    "翻译文件名称格式 {key} 可以为zh,en",
    DEFAULT_FILE_FORMAT
  )
  .option(
    "-k, --keys [keys]",
    "翻译文件中，所导出常量的变量名，以','分割，中文在前，英文在后",
    (key) => key.split(","),
    DEFAULT_KEYS
  )
  .action((source, opts) => {
    inspectFiles(source, opts.format, opts.keys, opts.use);
  });

program
  .command("translate <item...>")
  .passThroughOptions()
  .description("翻译指定的一句话，支持中英文")
  .addOption(useOption)
  .action((item) => {
    translate(item.join(" "), program.opts().use).then((e) => console.log(e));
  });

program.parse();
