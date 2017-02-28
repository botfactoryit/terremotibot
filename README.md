# TerremotiBot [![buddy pipeline](https://app.buddy.works/botfactory/terremotibot/pipelines/pipeline/44091/badge.svg?token=1ce39961b849f84cb49dda02976d656def4830d8eb28788fbf274129627d2933 "buddy pipeline")](https://app.buddy.works/botfactory/terremotibot/pipelines/pipeline/44091) [![codecov](https://codecov.io/gh/botfactoryit/terremotibot/branch/master/graph/badge.svg)](https://codecov.io/gh/botfactoryit/terremotibot)


This is the source code of the Italian bot TerremotiBot, available [on Telegram](https://t.me/TerremotiBot).

## How to run

```js
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
