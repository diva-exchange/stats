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

import csv from 'csv-parser'
import { Db } from './db'
import fs from 'fs'
import ip from 'ip'
import path from 'path'

export class Stats {
  /**
   * Install the app
   */
  static install () {
    const pathDb = path.join(__dirname, '../db/stats.sqlite')

    if (fs.existsSync(pathDb)) {
      fs.unlinkSync(pathDb)
    }
    Db.create('stats')

    // Chart bundle
    const pathSourceChart = path.join(__dirname, '../node_modules/chart.js/dist/Chart.bundle.min.js')
    const pathChart = path.join(__dirname, '../view/js/chart.bundle.min.js')
    if (fs.existsSync(pathChart)) {
      fs.unlinkSync(pathChart)
    }
    fs.copyFileSync(pathSourceChart, pathChart)
  }

  /**
   * @param config
   */
  constructor (config) {
    this._db = Db.connect('stats')
    this._dbCountry = []
  }

  /**
   *
   */
  hourly (from = -240, until = 0) {
    from = Math.floor(from)
    until = Math.floor(until)
    if (from >= 0) {
      from = -240
    }
    if (until > 0) {
      until = 0
    }
    if (until <= from) {
      from = -240
      until = 0
    }
    const now = Math.round((new Date()).getTime() / 1000)
    const _t = 60 * 60
    const f = Math.floor((now + (from * _t)) / _t) * _t
    const u = Math.floor((now + (until * _t)) / _t) * _t
    const sql = `SELECT 
        MIN(timestamp_utc) AS timestamp_utc,
        COUNT(*) AS hits
      FROM request
      WHERE timestamp_utc >= ${f}
      AND timestamp_utc < ${u}
      GROUP BY STRFTIME('%Y%m%d%H', datetime(timestamp_utc, 'unixepoch'))
      ORDER BY 1`
    this._export(sql, 'hourly')
  }

  /**
   *
   */
  daily (from = -180, until = 0) {
    from = Math.floor(from)
    until = Math.floor(until)
    if (from >= 0) {
      from = -180
    }
    if (until > 0) {
      until = 0
    }
    if (until <= from) {
      from = -180
      until = 0
    }
    const sql = `SELECT 
        MIN(timestamp_utc) AS timestamp_utc,
        COUNT(*) AS hits
      FROM request
      WHERE DATETIME(timestamp_utc, 'unixepoch') >= DATETIME('2020-12-14', 'start of day')
        AND DATETIME(timestamp_utc, 'unixepoch') >= DATETIME('now', 'start of day', '${from} days')
        AND DATETIME(timestamp_utc, 'unixepoch') < DATETIME('now', 'start of day', '${until} days')
      GROUP BY STRFTIME('%Y%m%d', DATETIME(timestamp_utc, 'unixepoch'))
      ORDER BY 1`
    this._export(sql, 'daily')
  }

  /**
   *
   */
  monthly (from = -60, until = 0) {
    from = Math.floor(from)
    until = Math.floor(until)
    if (from >= 0) {
      from = -90
    }
    if (until > 0) {
      until = 0
    }
    if (until <= from) {
      from = -90
      until = 0
    }
    until++
    const sql = `SELECT 
        MIN(timestamp_utc) AS timestamp_utc,
        COUNT(*) AS hits
      FROM request
      WHERE DATETIME(timestamp_utc, 'unixepoch') >= DATETIME('now', 'start of month', '${from} months')
      AND DATETIME(timestamp_utc, 'unixepoch') < DATETIME('now', 'start of month', '${until} months')
      GROUP BY STRFTIME('%Y%m', DATETIME(timestamp_utc, 'unixepoch'))
      ORDER BY 1`
    console.log(sql)
    this._export(sql, 'daily')
  }

  /**
   * @param sql {string}
   * @param name {string}
   * @private
   */
  _export (sql, name) {
    const data = []
    this._db.allAsArray(sql).forEach((row) => {
      data.push({ t: row.timestamp_utc * 1000, y: row.hits })
    })
    fs.writeFileSync(path.join(__dirname, `../view/js/${name}.js`),
      `const ${name}Chart = ${JSON.stringify(data)}`)
  }

  /**
   * GeoIP Format: ip_range_start, ip_range_end, country_code
   *
   * @returns {Promise<void>}
   * @private
   */
  _initGeoIP () {
    return new Promise((resolve) => {
      if (this._dbCountry.length) {
        resolve()
      }
      fs.createReadStream(path.join(__dirname, '../data/geo-whois-asn-country-ipv4-num.csv'))
        .pipe(csv(['ip_range_start', 'ip_range_end', 'country_code']))
        .on('data', (data) => this._dbCountry.push(data))
        .on('end', () => { resolve() })
    })
  }

  /**
   * @param pathFile {string}
   * @returns {Promise<number>}
   * @throws {Error}
   */
  async import (pathFile) {
    if (!fs.existsSync(pathFile)) {
      throw new Error(`File not found: ${pathFile}`)
    }

    await this._initGeoIP()
    return new Promise((resolve) => {
      const arrayData = []
      fs.createReadStream(pathFile)
        .pipe(csv({ headers: false, separator: ' ' }))
        .on('data', (data) => arrayData.push(data))
        .on('end', () => {
          this._db.delete('DELETE FROM request WHERE ident = @i', {
            i: path.basename(pathFile)
          })

          const arrayParam = []
          arrayData.forEach((row) => {
            const _ip = ip.toLong(row[0])
            const geo = this._dbCountry.find(o => _ip >= o.ip_range_start && _ip <= o.ip_range_end)
            const dt = new Date((row[3] + row[4])
              .replace(':', ' ')
              .replace('[', '')
              .replace(']', '')
            )
            arrayParam.push({
              i: path.basename(pathFile),
              r: row[5],
              dt: Math.round(dt.getTime() / 1000),
              c: geo ? geo.country_code : null
            })
          })

          this._db.insert(
            'INSERT INTO request (ident, resource, timestamp_utc, country) VALUES (@i, @r, @dt, @c)',
            arrayParam)
          resolve(arrayParam.length)
        })
    })
  }
}

module.exports = { Stats }
