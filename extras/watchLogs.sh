ps -ef | grep 'polkadot' |  awk '{system("journalctl -xe -f | grep " $2)}'