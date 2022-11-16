FROM nginx:latest
# FROM ubuntu:18.04

# # install nginx
# RUN apt-get update -y
# RUN apt-get install -y software-properties-common
# RUN add-apt-repository -y ppa:nginx/stable
# RUN apt-get update -y
# RUN apt-get install -y nginx


# update nginx config files
COPY nginx.conf /etc/nginx/conf.d/default.conf

# # certbot
# RUN apt-get update -y
# RUN apt-get install -y software-properties-common
# RUN add-apt-repository ppa:certbot/certbot
# RUN apt-get update -y
# RUN apt-get install -y certbot python-certbot-nginx

RUN echo "\ndaemon off;" >> /etc/nginx/nginx.conf

# expose ports
EXPOSE 80 443

WORKDIR /etc/nginx

CMD  ["nginx"]