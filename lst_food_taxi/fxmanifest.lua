fx_version 'cerulean'
game 'gta5'

name 'lst_food_taxi'
description 'Essenslieferungen an Los Santos Taxi fuer lb-phone'
author 'Los Santos Taxi'
version '0.1.0'

lua54 'yes'

dependencies {
    'es_extended',
    'lb-phone'
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/app.js'
}

shared_script 'config.lua'
client_script 'client.lua'
server_script 'server.lua'
