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

import { Logger } from '@diva.exchange/diva-logger'
import { Stats } from './src/stats'

const config = _configure()
Logger.trace('Configuration').trace(config)

const _stats = new Stats(config)
switch (process.argv[2] || '') {
  case 'hourly':
    _stats.hourly()
    break
  case 'daily':
    _stats.daily()
    break
  case 'monthly':
    _stats.monthly()
    break
  default:
    throw new Error('invalid command')
}

function _configure () {
  const config = require('./package.json')[process.env.NODE_ENV === 'production' ? 'Stats' : 'devStats']

  process.env.LOG_LEVEL = config.log_level = process.env.LOG_LEVEL || config.log_level ||
    (process.env.NODE_ENV === 'production' ? 'info' : 'trace')
  Logger.setOptions({ name: config.log_name || 'Stats', level: config.log_level })

 return config
}
