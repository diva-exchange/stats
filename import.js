/**
 * Copyright (C) 2020 diva.exchange
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * Author/Maintainer: Konrad Bächler <konrad@diva.exchange>
 */

'use strict'

import { Stats } from './src/stats'
import fs from 'fs'
import path from 'path'

if (!process.argv[2] || !fs.existsSync(process.argv[2])) {
  throw new Error('path to import not found')
}

(async () => {
  if (fs.lstatSync(process.argv[2]).isDirectory()) {
    const dir = fs.opendirSync(process.argv[2])

    let stats
    let dirent
    while ((dirent = dir.readSync()) !== null) {
      stats = new Stats()
      if (/^.+\.log$/.test(dirent.name)) {
        const count = await stats.import(path.join(process.argv[2], dirent.name))
        console.log(`Imported ${count} records from ${dirent.name}`)
      }
      stats = null
    }
    dir.closeSync()
  } else {
    const stats = new Stats()
    const count = await stats.import(process.argv[2])
    console.log(`Imported ${count} records from ${process.argv[2]}`)
  }
})()
