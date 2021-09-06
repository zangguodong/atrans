import * as child_process from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as trans from "translation.js";

const DIR_PATH = "/tmp/atrans";

type SUPPORT_USE = Exclude<keyof typeof trans, "google">;

export function clearSource(cmdFile: string) {
  fs.unlink(cmdFile, () => {});
  child_process.exec(`rm -rf ${DIR_PATH}`);
}
type TranslationRecord = { key: string; data: string };

export function translate<T extends string | TranslationRecord>(
  source: T,
  use: SUPPORT_USE = "youdao"
): Promise<T> {
  if (!source) {
    return;
  }
  if (typeof source === "string") {
    // @ts-ignore
    return trans[use]
      .translate(source)
      .then((result) => result.result[0])
      .catch((e) => {
        console.error("e", e);
      });
  }

  const id = source.key;
  // @ts-ignore
  return trans[use]
    .translate(source.data)
    .then((result) => ({ key: id, data: result.result[0] }));
}

export function inspectFiles(
  source: string,
  format: string,
  keys: string[],
  use: SUPPORT_USE
) {
  const formatRegex = new RegExp(
    "^" + format.replace(/{key}/g, "(\\w+)") + "$"
  );
  const sourceDir = path.resolve(process.cwd(), source);

  fs.readdir(sourceDir, (err, files) => {
    if (err) {
      console.error(err);
      return;
    }
    const jobs = files.map((f) => {
      const matcher = f.match(formatRegex);
      if (matcher) {
        const key = matcher[1];
        const source = [sourceDir, f].join("/");
        eval(
          `const ctx=require(source);
          extractData(ctx, key === "zh" ? keys[0] : keys[1])`
        );
      }
    });

    Promise.all(jobs)
      .then(() => {
        let allZhItems = map[keys[0]];
        let allEnItems = map[keys[1]];
        const lackItems: Array<TranslationRecord> = [];
        Object.keys(allZhItems).forEach((key) => {
          if (!(key in allEnItems)) {
            lackItems.push({ key: key, data: allZhItems[key] });
          }
        });
        let data = {};
        let jobs = [];
        lackItems.forEach((i) => {
          if (/^[a-zA-Z0-9_.\s]+$/.test(i.data)) {
            data[i.key] = i.data;
          } else {
            jobs.push(
              translate(i.data, use).then((result) => {
                data[i.key] = result;
              })
            );
          }
        });
        return { data, jobs };
      })
      .then(({ data, jobs }) =>
        Promise.all(jobs).then((_) => {
          const s = JSON.stringify(data, null, 2).replace(/(^{)|(}$)/g, "");
          console.log(`下面是数据
    ${s}`);
          pbcopy(s);
        })
      );
  });

  const map = {};
  function extractData(ctx: any, key: string) {
    map[key] = ctx[key];
    return key;
  }
}

function pbcopy(data) {
  const cmdFile = `tempTrans-${new Date().valueOf()}-cmd`;
  if (!fs.existsSync(DIR_PATH)) {
    fs.mkdirSync(DIR_PATH, "777");
  }

  const tmpPath = path.resolve(DIR_PATH, cmdFile);
  fs.writeFile(tmpPath, data, { encoding: "utf-8", flag: "w" }, (err) => {
    if (err) {
      console.log("error", err);
      clearSource(tmpPath);
      return;
    }
    child_process.exec(`pbcopy < ${tmpPath}`, (err) => {
      if (!err) {
        console.log("复制成功");
      }
      clearSource(tmpPath);
    });
  });
}
