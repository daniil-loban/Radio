requrements:
 ffmpeg & ffprobe on server

1. clone:
```git clone https://github.com/daniil-loban/Radio.git```

2. install modules:
```yarn install```

3. add some audio files to /audio folder

4. run server:
```yarn start```

then server will create in cache database:
 - record day (today)
 - fill tracks
 - generate test playlist from all tracks;
 - fill by playlist current day

5. open client:
```localhost:8080```

6. click Play button

7. wait some time...