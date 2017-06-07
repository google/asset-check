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

const fs = require('fs');
const colors = require('colors');
const url = require('url');
const https = require('https');
const jsonschema = require('jsonschema');
const schema = require('./schema').assetlinksSchema;

const DEFAULT_ENCODING = 'utf8';
const DEFAULT_USER_AGENT =
    'user-agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36';

const LOG_LEVELS = {
  SILENT: 0,
  INFO: 1,
  DEBUG: 2
};

/**
 * The AssetCheck main class
 *
 * Exposes the features of this application.
 *
 * @type {AssetCheck}
 */
class AssetCheck {

  /**
   * Create the application
   * @param  {string} assetFile the assetlinks.json file to consume
   *                            (local or hosted)
   * @param  {int}    logLevel  see LOG_LEVELS for list of supported levels
   * @param  {string} userAgent the user agent to request the file
   * @return {AssetCheck}       the configured AssetCheck
   */
  constructor(assetFile, logLevel, userAgent) {
    this.filename = assetFile;
    this.assetFile = new AssetFile(assetFile);
    this.hostname = false;
    this.hasErrors = false;
    this.logLevel = (logLevel == undefined) ? LOG_LEVELS.INFO : logLevel;
    this.validator = new jsonschema.Validator();
    this.schema = null;
    for (var key in schema) {
      if (this.schema == null) {
        this.schema = schema[key];
      }
      this.validator.addSchema(schema[key], key);
    }

    this.userAgent = (userAgent == undefined) ? DEFAULT_USER_AGENT : userAgent;
  }

  /**
   * Test the assetFile and display the output
   */
  run() {
    var uri = url.parse(this.filename);

    if (this.assetFile.isLocal()) {
      this.assetFile.getLocal((data) => {
        this.handleParseJson(
            data, (obj) => this.displayAssociations(obj),
            (err) => this.fatal('Errors with file contents: ' + err));
      }, (err) => {
        this.fatal('Unable to get contents of file', err);
      });
    } else {
      this.logDebug('User agent: ' + this.userAgent);
      this.logInfo('URL: '.green + this.assetFile.getFilename());
      this.assetFile.getRemote((data) => {
        this.handleHttpRequest(data);
      }, this.userAgent);
    }
  }

  /**
   * Handle a hosted assetlinks.json file
   *
   * @param  {http.IncomingMessage} res the incoming message to process
   */
  handleHttpRequest(res) {
    let statusCode = res.statusCode;
    let contentType = res.headers['content-type'];

    if (statusCode != 200) {
      let additional = ''
      if ('location' in res.headers) {
        additional += ' [ ' + res.headers['location'] + ' ]';
      }
      this.fatal('Bad response code: ' + statusCode + additional.yellow);
    }
    if (contentType.indexOf('application/json') != 0) {
      this.fatal('Bad response Content-Type: ' + contentType);
    }

    var body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      this.handleParseJson(
          body, (data) => this.displayAssociations(data), (err) => {
            this.fatal(err);
          });
    })
  }

  /**
   * Parse the string of json
   *
   * @param  {string}   data    the string representation of the json
   * @param  {Function} succeed the function to be called with the succesfully
   *                            parsed json
   * @param  {Function} fail    the function to be called when errors are found
   */
  handleParseJson(data, succeed, fail) {
    let obj;
    try {
      obj = JSON.parse(data);
    } catch (err) {
      // JSON parse error; do some further analysis to provide better error
      // messages

      // JSON does not allow a byte order mark
      if (err.message.startsWith(
              'Unexpected token \ufeff in JSON at position 0')) {
        return fail('File must be UTF-8 encoded _without_ a byte order mark (BOM)');
      }


      return fail('Unable to parse json' + err);
    }
    if (Object.keys(obj).length < 1) {
      return fail('No data in file.');
    }
    let results = this.validator.validate(obj, this.schema);
    if (results.errors.length > 0) {
      for (var e in results.errors) {
        var err = results.errors[e];
        this.err(err.property + ': ' + err.message);
      }
      return fail('Errors validating schema');
    }
    succeed(obj);
  }

  /**
   * Display any web & app associations
   *
   * @param  {Object} data the parsed json
   */
  displayAssociations(data) {
    var creds = {'web': [], 'android': []};
    var links = {'web': [], 'android': []};
    for (let item of Object.keys(data)) {
      try {
        var entry = new AssetEntry(data[item]);
        var relation = entry.getRelation();
        var target = entry.getTarget();
        if (target.isWeb()) {
          if (relation.hasGetLoginCreds()) {
            creds['web'].push(target.getSite());
          }
          if (relation.hasHandleAllUrls()) {
            links['web'].push(target.getSite());
          }
        } else {
          var appData = target.getAndroidData();
          if (relation.hasGetLoginCreds()) {
            creds['android'].push(appData['package_name']);
          }
          if (relation.hasHandleAllUrls()) {
            links['android'].push(appData['package_name']);
          }
        }
      } catch (err) {
        this.err('[entry] ' + err);
        continue;
      }
    }
    var displayed = false;
    if (creds['web'].length > 0 && creds['android'].length > 0) {
      displayed = true;
      this.logInfo('# \u2713 Smart Lock'.green);
      this.logDebug('## Websites linked:\n- ' + creds['web'].join('\n- '));
      this.logDebug('## To apps:\n- ' + creds['android'].join('\n- '));
    }
    if (links['web'].length > 0 && links['android'].length > 0) {
      displayed = true;
      this.logInfo('# \u2713 App Links'.green);
      this.logDebug('## Websites linked:\n- ' + links['web'].join('\n- '));
      this.logDebug('## To apps:\n- ' + links['android'].join('\n- '));
    } else if (links['android'].length > 0) {
      displayed = true;
      this.logInfo('# \u2713 App Links'.green);
      if (!this.hostname) {
        this.logDebug('## Current website');
      } else {
        this.logDebug('## Websites linked:\n- ' + this.hostname);
      }
      this.logDebug('## To apps:\n- ' + links['android'].join('\n- '));
    }
    if (!displayed) {
      this.logInfo('# No relations to display'.yellow);
    }
  }

  /**
   * Display an error message to the user
   *
   * @param  {string} msg        the message to display
   * @param  {string} additional any fyi description about the error
   */
  err(msg, additional) {
    if (this.logLevel <= LOG_LEVELS.SILENT) {
      return;
    }
    console.error(msg.red);
    this.hasErrors = true;
    if (additional != undefined) {
      console.error(JSON.stringify(additional).yellow);
    }
  }

  /**
   * Display an unrecoverable error message to the user
   *
   * @param  {string} msg        the message to display
   * @param  {string} additional any fyi description about the error
   */
  fatal(msg, additional) {
    this.err(msg, additional);
    process.exit(1);
  }

  /**
   * Display an info log message to the user
   *
   * @param  {string} msg        the message to display
   */
  logInfo(msg) {
    if (this.logLevel <= LOG_LEVELS.SILENT) {
      return;
    }

    if (msg == undefined || msg == '') {
      console.log();
    } else {
      console.log(msg);
    }
  }


  /**
   * Display an debug log message to the user
   *
   * @param  {string} msg        the message to display
   */
  logDebug(msg) {
    if (this.logLevel < LOG_LEVELS.DEBUG) {
      return;
    }
    this.logInfo(msg);
  }
}

/**
 * A representation of the assetlinks.json file
 *
 * Provides methods for interacting with the file
 *
 * @type {AssetFile}
 */
class AssetFile {

  /**
   * Build the assetfile representation
   * @param  {string} filename the full path to the file (hosted or local)
   * @return {AssetFile}       the configured AssetFile
   */
  constructor(filename) {
    if (filename.length < 1) {
      throw new Error('Empty filename');
    }
    this.filename = filename;
    this.uri = url.parse(filename);
  }

  /**
   * Get the unfiltered filename

   * @return {string} the filename
   */
  getFilename() {
    return this.filename;
  }

  /**
   * Check if the file path is local
   *
   * @return {Boolean} true if the file has a local path
   */
  isLocal() {
    return !(this.uri.hostname);
  }

  /**
   * Get the contents of the file from a URL
   *
   * Retreieves a handler to the file from calling a https request. The handler
   * function should accept a single http.IncomingMessage object.
   *
   * @param  {Function} handler the handling function for the response
   * @param  {string} userAgent the useragent to supply when requesting the file
   */
  getRemote(handler, userAgent) {
    userAgent = (userAgent == undefined) ? DEFAULT_USER_AGENT : userAgent;
    https.get(
        {
          hostname: this.uri.hostname,
          path: this.uri.path,
          headers: {'User-Agent': userAgent}
        },
        handler);
  }

  /**
   * Get the contents of a file if it's hosted on the local system.
   *
   * The handler function should expect the contents of the file
   *
   * @param  {Function} success to handle the contents of the file
   * @param  {Function} fail to handle errors with retrieving the file
   */
  getLocal(success, fail) {
    var err = '';
    try {
      let contents = fs.readFileSync(this.filename);
      if (contents.length > 0) {
        success(contents);
      }
      err = 'No file contents';
    } catch (e) {
      err = e;
    }
    fail(err);
  }
}

/**
 * A representation of the top level entry in an assetlinks.json file
 *
 * @type {AssetEntry}
 */
class AssetEntry {

  /**
   * Construct an AssetEntry
   *
   * @param  {Object} entry the object repr of the assetlinks.json file
   * @return {AssetEntry}   the configured AssetEntry
   */
  constructor(entry) {
    this.data = entry;
    if (!('relation' in this.data)) {
      throw Error('No relation defined');
    }
    this.relation = new AssetRelation(this.data['relation']);

    if (!('target' in this.data)) {
      throw Error('No target defined');
    }
    this.target = new AssetTarget(this.data['target']);
  }

  /**
   * Get the relation of the entry
   * @return {AssetRelation} the relation property
   */
  getRelation() {
    return this.relation;
  }

  /**
   * Get the target of the entry
   * @return {AssetTarget} the target property
   */
  getTarget() {
    return this.target;
  }
}

/**
 * The representation of the relation property of a assetlinks entry
 * @type {AssetRelation}
 */
class AssetRelation {

  /**
   * Construct an AssetRelation object
   * @param  {Object} data    the data that represents the AssetRelation
   * @return {AssetRelation}  the configured AssetRelation
   */
  constructor(data) {
    if (data.length < 1) {
      throw Error('No relation data');
    }
    this.data = data;
  }

  /**
   * Test if the relation has a login credentials association
   * @return {Boolean} true if there's a login credentials association
   */
  hasGetLoginCreds() {
    if (this.data.indexOf('delegate_permission/common.get_login_creds') >= 0) {
      return true;
    }
    return false;
  }

  /**
   * Test if the relation has a handle all urls association
   * @return {Boolean} true if there's a handle all urls association
   */
  hasHandleAllUrls() {
    if (this.data.indexOf('delegate_permission/common.handle_all_urls') >= 0) {
      return true;
    }
    return false;
  }
}

/**
 * A representation of the Target property of an assetlinks entry.
 * @type {AssetTarget}
 */
class AssetTarget {

  /**
   * Construct an AssetTarget object
   * @param  {Object} data    the data that represents the AssetTarget
   * @return {AssetRelation}  the configured AssetTarget
   */
  constructor(data) {
    if (!('namespace' in data)) {
      throw Error('Missing namespace in target');
    }
    this.data = data;
  }

  /**
   * Get the raw namespace of the target
   * @return {[type]} [description]
   */
  getNamespace() {
    return this.data['namespace'];
  }

  /**
   * Test if the target is the web
   * @return {Boolean} true if the target is web
   */
  isWeb() {
    if (this.getNamespace() == 'web' && this.getSite()) {
      return true;
    }
    return false;
  }

  /**
   * Test if the target is an android app
   * @return {Boolean} true if the target is android
   */
  isAndroid() {
    if (this.getNamespace() == 'android_app' && this.getAndroidData()) {
      return true;
    }
    return false;
  }

  /**
   * Get the site information for site targets
   * @return {string} the site information
   */
  getSite() {
    if (!('site' in this.data)) {
      throw Error('Missing site from target');
    }
    return this.data['site'];
  }

  /**
   * Get the android app information for the target
   *
   * The response is a dictionary mapping {
   *   sha256_cert_fingerprints: <fingerprint>,
   *   package_name: <package_name>
   * }
   *
   * @return {Object} the android app information
   */
  getAndroidData() {
    if (!('sha256_cert_fingerprints' in this.data)) {
      throw Error('Missing android fingerprint from target');
    }
    if (!('package_name' in this.data)) {
      throw Error('Missing android package name from target');
    }
    return {
      sha256_cert_fingerprints: this.data['sha256_cert_fingerprints'],
          package_name: this.data['package_name']
    }
  }
}

module.exports.AssetCheck = AssetCheck;
module.exports.LOG_SILENT = LOG_LEVELS.SILENT;
module.exports.LOG_INFO = LOG_LEVELS.INFO;
module.exports.LOG_DEBUG = LOG_LEVELS.DEBUG;
