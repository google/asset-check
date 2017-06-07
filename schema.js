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

/* JSON Schema Base */
const SCHEMA_BASE = {
  "id": "/Base",
  "type": "array",
  "items": {"$ref": "/BaseEntity"}
};

/* JSON Schema Base Entity */
const SCHEMA_ENTITY = {
  "id": "/BaseEntity",
  "type": "object",
  "properties": {
    "relation": {
      "$ref": "/RelationEntity",
      "required": true
    },
    "target": {
      "oneOf": [
        { "$ref": "/WebTarget"},
        { "$ref": "/AndroidTarget"}
      ],
      "required": true
    }
  }
}

/* JSON Schema Relation Entity */
const SCHEMA_RELATION = {
  "id": "/RelationEntity",
  "type": "array",
  "items": {"type": "string"}
};

/* JSON Schema Web Target Entity  */
const SCHEMA_WEB = {
  "id": "/WebTarget",
  "type": "object",
  "properties": {
    "namespace": {
      "type": "string",
      "enum": ["web"],
      "required": true
    },
    "site": {
      "type": "string",
      "required": true
    }
  },
  "additionalProperties": false
}

/* JSON Schema Android Target Entity  */
const SCHEMA_ANDROID = {
  "id": "/AndroidTarget",
  "type": "object",
  "properties": {
    "namespace": {
      "type": "string",
      "enum": ["android_app"],
      "required": true
    },
    "sha256_cert_fingerprints": {
      "type": "array",
      "items": {"type": "string"},
      "required": true
    },
    "package_name": {
      "type": "string",
      "required": true
    },
  },
  "additionalProperties": false
}

module.exports.assetlinksSchema = {
  "/Base": SCHEMA_BASE, // The first entry has to be the base schema
  "/BaseEntity": SCHEMA_ENTITY,
  "/RelationEntity": SCHEMA_RELATION,
  "/WebTarget": SCHEMA_WEB,
  "/AndroidTarget": SCHEMA_ANDROID
};
