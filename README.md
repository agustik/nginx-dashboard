Dashboard for NGINX
=========

#Setup
* Install nginx from source with nginx-module-vts
* Clone this repo
* Copy config.js.editme to config.js and point server to your 'status'
* Add this config to nginx, or fix it..
```
server {
      server_name YOURDOMAIN;
      root /usr/share/nginx/html;

      # Redirect requests for / to /status.html
      location = / {
          return 301 /dashboard.html;
      }

      location = /dashboard.html {}

      # Everything beginning /status (except for /status.html) is
      # processed by the status handler

      # If you change this, then you need to update config.js
      location /status {
          vhost_traffic_status_display;
          vhost_traffic_status_display_format json;
      }
  }
```

Thanks to vozlt for awesome NGINX module.
