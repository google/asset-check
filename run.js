#!/usr/bin/env node
/*
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const program = require('commander');
const ac = require('./index.js')
const AssetCheck  = ac.AssetCheck;
const LOG_INFO = ac.LOG_INFO;
const LOG_DEBUG = ac.LOG_DEBUG;

program
  .version('0.0.1')
  .description('Check your asset-links.json file')
  .option('-d, --debug', 'Enable debug')
  .option('-u, --user-agent <agent>', 'Specify user agent')
  .parse(process.argv);

if (!program.args.length) {
  console.error("No filename specified");
  return;
}

let logLevel = (program.debug) ? LOG_DEBUG : LOG_INFO;
let assetCheck = new AssetCheck(program.args.shift(), logLevel,
  program.userAgent);
assetCheck.run();
