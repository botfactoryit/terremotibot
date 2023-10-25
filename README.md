<h1 align="center">
  <a href="https://terremotibot.it"><img src="logo.png" alt="TerremotiBot" /></a>
</h1>
<div align="center">
  <a href="https://github.com/botfactoryit/terremotibot/releases"><img src="https://img.shields.io/github/release/botfactoryit/terremotibot.svg" alt="GitHub release"></a>
  <a href="https://github.com/botfactoryit/terremotibot/blob/master/LICENSE"><img src="https://img.shields.io/github/license/botfactoryit/terremotibot.svg" alt="License"></a>
</div>
<br/>
<div align="center">
🎯 Source code of the Italian bot TerremotiBot, available <a href="https://t.me/TerremotiBot">on Telegram</a>
</div>

## Configuration

A `config.json` file should be placed in the `config` directory. The template for the configuration file is `example.config.json`.

| Key | Required | Explanation |
| --- | -------- | ----------- |
| `telegram.token` | Yes | The [Telegram Bot API](https://core.telegram.org/bots/api) bot token |
| `telegram.serverPort` | Yes | The port used for the HTTP webhook server |
| `db.connectionString` | Yes | [MongoDB connection string](https://docs.mongodb.com/manual/reference/connection-string/) |
| `ingv.pollingInterval` | Yes | Interval for [INGV](https://terremoti.ingv.it/) server polling |
| `ingv.broadcastThreshold` | Yes | Magnitude threshold value. Earthquakes with a magnitude above this value will be notified to all chats in the database. To disable broadcast notifications, set the value to an high number (like 10) |
| `social.enabled` | Yes | Enable or disable the feature that publishes earthquakes to social networks |
| `social.threshold` | No | Social publish threshold value |
| `social.facebook.accessToken` | No | Generate a permanent access token for the page you want to publish to. See [Facebook docs](https://developers.facebook.com/docs/marketing-api/authentication) or [StackOverflow](http://stackoverflow.com/questions/17197970/facebook-permanent-page-access-token) |
| `social.facebook.pageId` | No | The ID of the page you want to publish the post to           |
| `social.twitter.*` | No | Twitter keys                                                 |
| `geonames.username` | Yes | Username for the [GeoNames](http://www.geonames.org/) service, used for reverse geocoding |
| `mapbox.token` | Yes | [Mapbox](https://www.mapbox.com/) token for generating the maps for the notifications |

## How to run it

```js
npm ci
npm run dev
```

## Run with Docker

You can run the application locally with Docker. This Docker Compose configuration brings up a MongoDB instance, and the [base image](https://github.com/botfactoryit/docker-for-terremotibot) already includes all the required dependencies (currently Node.js and GraphicsMagick).

```sh
docker-compose -f docker-compose.dev.yml up --build
```

You can also run MongoDB in a separate shell:

```sh
docker-compose -f docker-compose.dev.yml up mongo
```

And then run the actual bot:

```sh
docker-compose -f docker-compose.dev.yml up --build bot
```

## Run tests with Docker

You can run tests locally with Docker. This brings up a MongoDB instance used for runnig tests. After they are completed, stop Compose pressing CTRL+C (once).

```sh
docker-compose -f docker-compose.tests.yml up --build
```
