systemctl list-units | grep polkadot | awk '{system("systemctl restart " $1)}' && ps -ef | grep 'polkadot' |  awk '{system("journalctl -xe -f | grep " $2)}'