#!/bin/sh
exec /usr/bin/mariadb --ssl=0 "$@"
