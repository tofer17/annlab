# ANN Lab

> Artifical Neural Network Lab (and b)

> ...in Javascript, whynot

---

I got into this long ago with a pretty frumpy Java app running on a spare Tomcat server: I fed it financial data from MSFT (open, high, low, close, volume) provided by Yahoo and every once in a while it would get pretty good at predicting "the next day."

Well, this version is a far off from that. But ultimately I wanted to create a simplistic "ANN" sandbox to do goofy things like [Google's Deep Dream generator](https://deepdreamgenerator.com/) or even [GNU Backgammon](https://www.gnu.org/software/gnubg/) (or well there's [MSFT](https://finance.yahoo.com/quote/MSFT/history?p=MSFT), too).

Still a WIP, the lab allows you to select various parameters, assemble a prototype network, and iterate it through a Genetic Algorithm.

Currently it uses <del>Array's **all over the place**</del> <ins>Array's in anti-performant ways in places where performance is needed</ins> so that explains its <del>pathetic</del><ins>degraded</ins> performance (well, besides Javascript). Notwithstanding other optimizations that can be made down the road.

