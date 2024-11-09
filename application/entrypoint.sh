#!/bin/sh
export DATABASE_URL="postgresql://${USERNAME}:${PASSWORD}@${HOST}:${PORT}/${DATABASE}"
exec "$@"