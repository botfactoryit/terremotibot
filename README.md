<h1 align="center">
  <a href="https://botfactory.info/terremotibot"><img src="https://botfactory.info/terremotibot/resources/logo_header.png" alt="TerremotiBot" /></a>
</h1>
<div align="center">
  <a href="https://github.com/botfactoryit/terremotibot/releases"><img src="https://img.shields.io/github/release/botfactoryit/terremotibot.svg" alt="GitHub release"></a> 
  <a href="https://codecov.io/gh/botfactoryit/terremotibot"><img src="https://img.shields.io/codecov/c/github/botfactoryit/terremotibot.svg" alt="Code coverage"></a>
  <a href="https://david-dm.org/botfactoryit/terremotibot"><img src="https://img.shields.io/david/botfactoryit/terremotibot.svg" alt="Dependencies"></a>
  <a href="https://github.com/botfactoryit/terremotibot/blob/master/LICENSE"><img src="https://img.shields.io/github/license/botfactoryit/terremotibot.svg" alt="License"></a>
</div>
<br/>
<div align="center">
🎯 Source code of the Italian bot TerremotiBot, available <a href="https://t.me/TerremotiBot">on Telegram</a>
</div>

## How to run

```js
yarn
node index.js
```

But before...

## Configuration

A `config.json` file should be placed in the `config` directory. The template for the configuration file is `example.config.json`.

| Key | Required | Explanation |
| --- | -------- | ----------- |
| `telegram.token` | Yes | The [Telegram Bot API](https://core.telegram.org/bots/api) bot token |
| `telegram.serverPort` | Yes | The port used for the HTTP webhook server |
| `botan.token` | No | The token to be used to log incoming messages on the [Botan](http://botan.io/) platform. Leave blank to disable Botan integration |
| `db.connectionString` | Yes | [MongoDB connection string](https://docs.mongodb.com/manual/reference/connection-string/) |
| `ingv.pollingInterval` | Yes | Interval for [INGV](http://cnt.rm.ingv.it/) server polling |
| `ingv.broadcastThreshold` | Yes | Magnitude threshold value. Earthquakes with a magnitude above this value will be notified to all chats in the database. To disable broadcast notifications, set the value to an high number (like 10) |
| `social.enabled` | Yes | Enable or disable the feature that publishes earthquakes to an [Amazon SQS](https://aws.amazon.com/sqs/) queue, for being later [published](https://github.com/botfactoryit/terremotibot-social) to social networks |
| `social.threshold` | No | Social publish threshold value |
| `social.sqs` | No | Credentials for publishing earthquakes and image cards to [SQS](https://aws.amazon.com/sqs/) |
| `geonames.username` | Yes | Username for the [GeoNames](http://www.geonames.org/) service, used for reverse geocoding |
| `mapbox.token` | Yes | [Mapbox](https://www.mapbox.com/) token for generating the maps for the notifications |
| `stathat.key` | No | [StatHat](https://www.stathat.com/) key for logging some metrics |
