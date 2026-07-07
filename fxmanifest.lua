fx_version 'cerulean'
game 'gta5'

name 'lst_phone_taxi'
description 'Los Santos Taxi App fuer lb-phone'
author 'Los Santos Taxi'
version '1.1.1'

lua54 'yes'

dependency 'lb-phone'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/phone.html',
    'html/style.css',
    'html/phone-polish.css',
    'html/app.js',
    'html/icon.png'
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
