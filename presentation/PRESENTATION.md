
State Today
Terminal emulators are funny beasts. They've been here forever and we all use 
them , yet there's not much innovation in that field. The last major innovation
was probably the introduction of tabs a few decades ago.

Especially when you have to run an infrastructure, when it comes get access
to the terminal on each machine it quicly gets complicated. 
It's a nonse that you can't open a terminal emulator right out of munin, nagios 
or OVH. I think AWS provides this service but you have to install a java applet.
A Java applet! Come on!

Tools exists to administer clusters or multiple machines at the same time such
as pconsole, puppet, clusterSSH or capistrano, but they are ages away of what
could be done if they were able to fully emulate a terminal.
 
The Problem
I believe that the reason why there's so little innovation related to terminal
emulation is because, terminal emulation is complex and hard. To illustrate we
need to have closer look to terminal emulation. Since terminal emulation is 
central to any UNIX system, it's always a good thing for the sysadmin or the 
developper to have a basic understanding of how it works.




#Terminal emulation is the process of emulating in user land a video terminal,
#also formelly known as a teletype or a TTY.

#Since the TTY is a central piece of Linux, it's important for any developer or
#sysadmin to have a basic understanding of what it is. For that a little bit of
#history is needed

#It all started in 1869 with the appearance of the stock ticker which consisted
#of a typewriter and a ticker printer linked by a long pair of wires. It was used
#to transmit stock prices over long distances.

#The concept gradually evolved into the faster ASCII based teletype (or TTY). At
#the same time, computers which where still quite large and primitive, started to 
#be powerful enough to interact with users in realtime.

At this point, someone had the great idea of connecting a teletype to its 
mainframe instead of punching cards. And the TTY was born.

So this was pretty much the situation in the early days of UNIX. You would have
in the kernel a Universal Asynchronous Receiver and Transmitter driver and a 
teletype driver in order to communicate with the physical teletype attached to
the mainframe.

User processes would be exposed to it though their standard streams 
(stdin, stdout) under the management of the TTY Driver 
(foreground, background, etc)

                                        --Kernel--
TTY - Modem - Physical Line - Modem - UART -- | UART Driver - TTY Driver | - User process

In the late 1970s, the teletypes were rapidly replaced by more powerful video 
terminals such as the VT100, which came with advanced features such as cursor 
movement and colors. At this stage and since then, the use of these features 
where left to the applications to use thanks to escape sequences

VT100:
           console.log('\x1b[1;1H'); // set cursor position (1,1)

Then came the PC. 
Eventually video terminal and teletypes disappeared with the rise of the
personnal computer. So kernels ended up emulating video terminals to display
the emulated state directly on the screen they were connected to for their user 
to interact with.

Screen/Keyboard - | VGA Driver/Keyboard Driver - Terminal Emulator - TTY Driver | - User Process

This is somewhet rigid and things got a little bit more flexible when terminal
emulation was moved into userland. That's how pseudo terminals or PTY were 
introduced. They allow terminal emulator like xterm to emulate and display
a terminal in the available graphical user interface (X)

On Linux, the system call is `openpty` and it returns a master file descriptor
available for terminal emulation and a slave file descriptor connected to the 
the user processes standard streams. 

| slave pty  | - User process
| master pty | - xterm

Bottom line, if you want to code a terminal emulator, you must be able to talk
vim/emacs' language, that is more or less the VT100 protocol plus a few
extensions added over the time... You have to basically turn a continuous stream
of characters and escape sequences into an in memory representation of the
displayable character grid

`...\x1b[123;23H\x1b[a;...` ---> |      |

And talking VT100 is not that easy!

http://vt100.net/emu/vt500_parser.png

Here are a few excerpt of comments in the code of famous terminal emulators

>xterm

>tmux

