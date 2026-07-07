fx_version 'cerulean'
game 'gta5'

name 'lst_phone_taxi'
description 'Los Santos Taxi App fuer lb-phone'
author 'Los Santos Taxi'
version '1.0.0'

lua54 'yes'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/app.js'
}

shared_scripts {
    'config.lua'
}

client_scripts {
    'client.lua'
}

server_scripts {
    'server.lua'
}
