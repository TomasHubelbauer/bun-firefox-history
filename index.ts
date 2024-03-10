import os from 'os';
import fs from 'fs';
import path from 'path';
import { Database } from "bun:sqlite";
import { Glob } from 'bun';

const userName = os.userInfo().username;
const directoryPath = `/Users/${userName}/Library/Application Support/Firefox/Profiles/`;

const glob = new Glob('**/places.sqlite');
for await (const fileName of glob.scan(directoryPath)) {
  const filePath = `${directoryPath}${fileName}`;
  const tempFilePath = `${process.env.TMPDIR}${fileName}`;
  await fs.promises.mkdir(path.dirname(tempFilePath), { recursive: true });
  await fs.promises.copyFile(filePath, tempFilePath);

  console.log(fileName);
  const database = new Database(tempFilePath);

  const query = `select moz_historyvisits.visit_date, moz_places.url, moz_places.title from moz_historyvisits join moz_places on moz_historyvisits.place_id = moz_places.id where date(moz_historyvisits.visit_date / 1000000, 'unixepoch', 'localtime') = date('now', 'localtime') order by moz_historyvisits.visit_date;`;
  const visits = database.query(query).all() as { visit_date: number; url: string; title: string; }[];
  for (const visit of visits) {
    const stamp = new Date(visit.visit_date / 1000).toISOString().slice('yyyy-mm-dd-'.length, 'yyyy-mm-dd-hh-mm-ss'.length);
    const host = new URL(visit.url).host;
    const title = visit.title ? visit.title.slice(0, 80) + (visit.title.length > 80 ? '…' : '') : '';
    console.log(`\t${stamp} ${host} ${title}`);
  }

  await fs.promises.unlink(tempFilePath);
}
