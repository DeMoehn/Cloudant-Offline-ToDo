Cloudant Offline ToDo List
=================

##Changes
- Added PouchDB 3.0

##How to run

* Clone the repository and change to the "app" directory
```
      $ cd /Cloudant-Offline-ToDo/app/...
```
* Change the name from config-example to config
```
      $ mv config-example config
```
* Edit the config-example with your credentials (Press `Ctrl+X` to finish, Accept with `Y` and `Enter`)
```
      $ sudo nano config
```
* Edit your local hosts file to point `local.dev` at `localhost`:
```
      $ sudo nano /etc/hosts
```
* Add `127.0.0.1 local.dev` to the end of the file. (Press `Ctrl+X` to finish, Accept with `Y` and `Enter`)

* Configure CORS support on Cloudant.  Change `USERNAME` to your account name:
```
      $ curl -i -u USERNAME -X PUT https://USERNAME.cloudant.com/_api/v2/user/config/cors -H "Content-Type: application/json" -d '{"enable_cors":true,"allow_credentials":true,"allow_methods":["GET","PUT","POST","DELETE","OPTIONS"],"origins":["http://local.dev:8000"]}'
```
* Use the `server.py` script to run a simple python server on your localhost to test the application locally
```
      $ python server.py
```
* Run the deployment Script to create views and sample data in your Cloudant Account (NOT needed right now, as we currenty don't use design documents (views))
```
      $ ./deploy
```
* Visit http://local.dev:8000/crud.html
