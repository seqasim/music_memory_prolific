# How to use this folder

This folder is a practice assignment. It teaches you how to analyze the Music Memory study.

The people in these files are made up. The files are shaped like the real ones you will get later. Nothing you do here can break the real study.

Work through it slowly. Plan on a few hours, with breaks. You are supposed to read the words, then run a small piece of code, then look at what it printed, then move on.

## What is in this folder

- `music_memory_analysis_tutorial.ipynb` — the lesson. This is the file you open.
- `fake_data/` — the practice data. Leave these files as they are. Do not rename them, edit them, or move them.
- `README.md` — this page.

`fake_data/answer_key.json` is a cheat sheet for the practice data. The lesson checks your work against it near the end. You do not need to open that file yourself.

## Words you will see

- A **notebook** is a document that mixes writing and code. The file ends in `.ipynb`.
- A **cell** is one box in the notebook. Some cells are writing. Some cells are code.
- **Run** means “do what this box says.” The computer runs one box at a time.
- A **CSV** is a spreadsheet saved as plain text. The practice spreadsheets are in `fake_data/pavlovia/`. They are large. Open them from the notebook, not by double-clicking them in Excel.
- **Python** is the programming language the notebook uses. You do not need to know it yet. The notebook explains each step.

## What to install first

You need Anaconda. It is a free program that includes Python and the tools this lesson uses (pandas, numpy, matplotlib, scipy, and Jupyter).

1. Go to [https://www.anaconda.com/download](https://www.anaconda.com/download) and download the installer for your computer.
2. Install it. Accept the usual defaults.
3. If Anaconda is already installed, skip this step.

## How to open the lesson

The notebook has to be started from inside this folder. If you open it from somewhere else, it will not find the data.

**On a Mac**

1. Open the app named Terminal.
2. Type `cd ` with a space after it. Do not press Enter yet.
3. Drag this folder from Finder onto the Terminal window. The folder’s location will appear.
4. Press Enter.
5. Type this and press Enter:

```bash
jupyter notebook
```

**On Windows**

1. Open the app named Anaconda Prompt.
2. Type `cd ` with a space after it. Do not press Enter yet.
3. Drag this folder from File Explorer onto the Anaconda Prompt window.
4. Press Enter.
5. Type this and press Enter:

```bash
jupyter notebook
```

A browser window will open and show the files in this folder. Click `music_memory_analysis_tutorial.ipynb`.

If a box asks you to pick a kernel, choose **Python 3**.

If the command `jupyter notebook` is not found, close the window, open Anaconda Prompt (Windows) or a new Terminal after installing Anaconda (Mac), and try again from step 2.

## How to move through the notebook

1. Start at the top.
2. Read the writing cell.
3. Click the next code cell. It is the gray box.
4. Press **Shift+Enter**. That runs the box and moves you down.
5. Wait until the star `[*]` at the left turns into a number. A number means that box finished.
6. Read the output under the box. Sometimes that is a table. Sometimes it is a chart.
7. Repeat until you reach the bottom.

The first code cell loads the tools and finds the data. Every later cell uses that work. If you jump to the middle, the later cells will fail. If you close the notebook and come back another day, start again from the top.

Run the cells yourself. Watching someone else run them teaches you less.

## When something goes wrong

A red message under a cell means that cell did not finish.

1. Read the last line of the red message.
2. Check that you started Jupyter from this folder, using the steps above.
3. Use the menu **Kernel → Restart & Run All**, then wait. This reruns every cell from the top in order.
4. If it is still red, take a screenshot of the red message and the cell above it, and send it to the person who gave you this folder.

Common fixes:

- `No such file or directory` or `fake_data`: Jupyter was started from the wrong folder. Quit it, and follow “How to open the lesson” again.
- `ModuleNotFoundError`: a tool is missing. In the same window where you typed `jupyter notebook`, press Control+C, then type `conda install pandas numpy matplotlib scipy` and press Enter. When that finishes, type `jupyter notebook` again.

## The exercises

Near the end there is a section called Exercises. Try each one before you open the answer. The answer is hidden under a small triangle. Click the triangle only after you have tried.

The cell under the exercises prints the answers when you run it. The line `Exercise checks passed.` means your run matches the practice data.

The line `Answer-key checks passed.` means the main analysis matches the cheat sheet. That is the finish line for the lesson.

## What you are practicing

The notebook has 11 sections. Each one does one job:

1. What the task was (videos, a memory test, then music ratings).
2. What one raw data file looks like.
3. How to load every file.
4. How to decide which people to set aside.
5. Memory for the videos.
6. How sure people were.
7. Whether people remembered the music that played with a video.
8. The music ratings.
9. Whether some videos are easier to remember than others.
10. Simple statistics.
11. A check against the answer key, then the exercises.

Take notes in your own words as you go. A useful note says what the cell did and what the number means. “d′ was higher for MEAM” is a useful note. “I ran the cell” is not.
