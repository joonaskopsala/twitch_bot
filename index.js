const tmi = require('tmi.js');
const config = require('config');

const TWITCH_OAUTH_TOKEN = config.get('Settings.twitch_token');
const token = config.get('Settings.spotify_token');;

const Promise = require("bluebird");
const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');

const client = new tmi.Client({
  options: { debug: true },
  connection: {
    secure: true,
    reconnect: true
  },
  identity: {
    username: config.get('Settings.twitch_username'),
    password: TWITCH_OAUTH_TOKEN
  },
  channels: [config.get('Settings.channel')]
});

client.connect();

client.on('message', (channel, tags, message, self) => {
  // Ignore echoed messages.
  if(self) return;

    if(tags['custom-reward-id'] == config.get('Settings.reward_id')) {
        if(message.includes('https://open.spotify.com/track/')){
            var url = parseSpotifyUrl(message);
            spotifyApi.addToQueue(
                url,
                { limit: 10, offset: 20 },
                function(err, data) {
                if (err) {
                    client.say(channel, 'vituiks meni: ' + err);
                } else {
                    (async () => {
                        var trackid = url.replace("spotify:track:","");
                        var data = await spotifyApi.getTrack(trackid);
                        client.say(channel, data.body.name);
                      })().catch(e => {
                        console.error(e);
                      });
                }
                }
            );
        }
    }
});

var parseSpotifyUrl = function(url){
    //var url = 'https://open.spotify.com/track/2cV91WmwwQjaQPklz5OoAZ?si=808ca939ecc14b9f';
    var base = 'spotify:track:';

    url = url.replace("https://open.spotify.com/track/", "");
    url = url.substring(0, url.indexOf('?'));
    base = base + url;

    return(base);
}
 
const scopes = [
   'ugc-image-upload',
   'user-read-playback-state',
   'user-modify-playback-state',
   'user-read-currently-playing',
   'streaming',
   'app-remote-control',
   'user-read-email',
   'user-read-private',
   'playlist-read-collaborative',
   'playlist-modify-public',
   'playlist-read-private',
   'playlist-modify-private',
   'user-library-modify',
   'user-library-read',
   'user-top-read',
   'user-read-playback-position',
   'user-read-recently-played',
   'user-follow-read',
   'user-follow-modify'
];
 
const spotifyApi = new SpotifyWebApi({
   redirectUri: 'http://localhost:8888/callback',
   clientId: '7c31cc2bce9e40bcb1ad8e6392b747c6',
   clientSecret: '7d85460c21a447e9823296a81e23d04d'
});

spotifyApi.setAccessToken(token);
 
const app = express();
 
app.get('/login', (req, res) => {
    res.redirect(spotifyApi.createAuthorizeURL(scopes));
});
 
app.get('/callback', (req, res) => {
    const error = req.query.error;
    const code = req.query.code;
    const state = req.query.state;
 
    if (error) {
        console.error('Callback Error:', error);
        res.send(`Callback Error: ${error}`);
        return;
    }
 
   spotifyApi
     .authorizationCodeGrant(code)
     .then(data => {
       const access_token = data.body['access_token'];
       const refresh_token = data.body['refresh_token'];
       const expires_in = data.body['expires_in'];
 
       spotifyApi.setAccessToken(access_token);
       spotifyApi.setRefreshToken(refresh_token);
 
       console.log('access_token:', access_token);
       console.log('refresh_token:', refresh_token);
 
       console.log(
         `Sucessfully retreived access token. Expires in ${expires_in} s.`
       );
       res.send('Success! You can now close the window.');
 
       setInterval(async () => {
         const data = await spotifyApi.refreshAccessToken();
         const access_token = data.body['access_token'];
 
         console.log('The access token has been refreshed!');
         console.log('access_token:', access_token);
         spotifyApi.setAccessToken(access_token);
       }, expires_in / 2 * 1000);
     })
     .catch(error => {
       console.error('Error getting Tokens:', error);
       res.send(`Error getting Tokens: ${error}`);
     });
 });
 
 app.listen(8888, () =>
   console.log(
     'HTTP Server up. Now go to http://localhost:8888/login in your browser.'
   )
 );