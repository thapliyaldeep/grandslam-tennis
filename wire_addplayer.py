import re,sys
p='src/App.js'
s=open(p).read()
if 'AddPlayerForm' in s:
    print('Already wired, nothing to do'); sys.exit(0)
n=s.count('<DoublesTeamBuilder')
print('DoublesTeamBuilder usages found:',n)
if n!=1:
    print('STOP: expected exactly 1, not changing anything'); sys.exit(1)
m=re.search(r'^(\s*)(<DoublesTeamBuilder[^\n]*)$',s,re.M)
if not m:
    print('STOP: tag is not on a single line, not changing anything'); sys.exit(1)
line=m.group(0)
indent=m.group(1)
s=s.replace(line,indent+'<AddPlayerForm leagueId={leagueId}/>\n'+line,1)
# add import after the last import line
imps=list(re.finditer(r'^import .*$',s,re.M))
last=imps[-1]
s=s[:last.end()]+"\nimport { AddPlayerForm } from './AddPlayer';"+s[last.end():]
open(p,'w').write(s)
print('Done: import added and form placed above Build Teams')
