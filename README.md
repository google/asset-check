# Asset Check
Check your assetlinks.json file for associations, ensuring you're configured correctly.

## Install
Install the node dependencies and link the executable:
```
npm install
npm link
```

## Usage
If you've linked the package you can use:
```
asset-check <filename>            # check a file
asset-check <url>                 # check a url

asset-check -u <useragent> <url>  # check a url with a specific useragent
asset-check -d <url>              # (debug mode) check a url
```

Or in your install directory:
```
./index.js <filename>             # check a file
./index.js <url>                  # check a url

./index.js -d <useragent> <url>   # check a url with a specific useragent
```

### Examples
```
> asset-check -d assetlinks.json
instance[1].target: is not exactly one from </WebTarget>,</AndroidTarget>
Errors validating schema

› asset-check https://www.google.com/.well-known/assetlinks.json
URL: https://www.google.com/.well-known/assetlinks.json
# App Links:
## Websites linked:
- www.google.com
## To apps:
- com.google.android.calendar
```

## Tests
```npm test```

## Release History
* 0.1.0 Initial release
