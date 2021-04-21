const pluginRss = require("@11ty/eleventy-plugin-rss");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const Image = require("@11ty/eleventy-img");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const markdownIt = require("markdown-it");
const md = new markdownIt();
const sass = require("sass");

if (process.env.NODE_ENV === "production") {
  console.log("Building site for production.")
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPairedShortcode("footnotes", function (todoItems) {
    return `<aside class='footnotes'>
            ${todoItems}
</aside>
            `;
  });

  eleventyConfig.addLiquidShortcode("myImage", async function(src, alt) {
    if (!alt) {
      throw new Error(`Missing \`alt\` on Image from: ${src}`);
    }

    let stats = await Image(src, {
      widths: [25, 320, 640, 960, 1200, 1800, 2400],
      formats: ["jpeg", "webp"],
      urlPath: "/grfx/",
      outputDir:  "./_site/grfx/",
    });

    let lowestSrc = stats["jpeg"][2];
    let highResJpeg = stats["jpeg"][3];
    let lowReswebp = stats["webp"][2];
    let highReswebp = stats["webp"][3];
  

    const srcset = Object.keys(stats).reduce(
      (acc, format) => ({
        ...acc,
        [format]: stats[format].reduce(
          (_acc, curr) => `${_acc} ${curr.srcset} ,`,
          ""
        ),
      }),
      {}
    );

    const source = `<source type="image/webp" media="(max-width: 629px)" srcset="${lowReswebp.url}" >
                    <source type="image/webp" media="(min-width: 630px)" srcset="${highReswebp.url}" >
                    <source type="image/jpeg" media="(max-width: 529px)" srcset="${lowestSrc.url}" >
                    <source type="image/jpeg" media="(min-width: 630px)" srcset="${highResJpeg.url}" >`;

    const img = `<img 
                loading="lazy" 
                alt="${alt}" 
                width="${highResJpeg.width}"
                src="${lowestSrc.url}">`;

    return `<picture>${source}${img}</picture>`;
  });	

  eleventyConfig.addFilter("wordcount", function (s) {
    const words = s.split(" ");
    const minutes = words.length / 180;
    return minutes.toFixed(1);
  });
  eleventyConfig.addShortcode(
    "fig",
    function (url, caption, alt, source, className) {
      if (!caption) {
        caption = "";
      }
      let sourceString = "";
      if (source) {
        sourceString = `<span class='fig-source long'>${md.render(
          source
        )}</span>`;
      }

      return `<figure class='post-figure ${className}'>
        <img alt="${alt}" loading="lazy" src='${url}'/>
        <figcaption>${md.render(caption)} ${sourceString}</figcaption>
        </figure>
        `;
    }
  );
  eleventyConfig.addFilter("renderMarkdown", function (value) {
    return md.render(value);
  });
  eleventyConfig.addShortcode("css", function (filename) {
    if (process.env.NODE_ENV === "production") {
      let css = sass.renderSync({
        file: `./css/${filename}`,
        outputStyle: "compressed",
      });
      return `<style>${css.css.toString()}</style>`;
    } else {
      return `<link rel="stylesheet" href="/${filename.replace("scss", "css")}"/>`
    }
  });
  eleventyConfig.addShortcode("fn", function (content) {
    return `
        <span class="fn" data-content='${md.render(content)}'>
        </span>
    `;
  });
  eleventyConfig.addPairedShortcode("details", function (content, summary) {
    return `<details><summary>${summary}</summary>${md.render(content)}</details>`;
  });
  eleventyConfig.addPairedShortcode("leadin", function (content) {
    return `<span class="leadin">${content}</span>`;
  });
  eleventyConfig.addTransform(
    "resolveFootnotes",
    function (content, outputPath) {
      if (outputPath.endsWith(".html")) {
        const dom = new JSDOM(content);
        let transformed = "";
        const footnotes = dom.window.document.querySelectorAll(".fn");
        const footnoteContainer = dom.window.document.querySelector(
          ".post-footnotes"
        );
        if (footnotes && footnoteContainer) {
          const footnoteList = dom.window.document.createElement("ol");
          footnotes.forEach((fn, i) => {
            const fnItem = dom.window.document.createElement("li");
            const link = dom.window.document.createElement("a");
            link.setAttribute("href", `#fn-${i}`);
            link.textContent = i + 1;
            fn.appendChild(link);
            fnItem.setAttribute("id", `fn-${i}`);
            fnItem.innerHTML = fn.getAttribute("data-content");
            footnoteList.appendChild(fnItem);
          });
          footnoteContainer.appendChild(footnoteList);
          transformed = dom.serialize();
          return transformed;
        }
      }
      return content;
    }
  );

  eleventyConfig.addCollection("aboutstuff", function (collectionApi) {
    return collectionApi.getFilteredByGlob([
      "./about/*.md",
      "./about/*.markdown",
    ]);
  });


  eleventyConfig.addCollection("notes", function (collectionApi) {
    return collectionApi.getFilteredByGlob([
      "./notes/*.md",
      "./notes/*.markdown",
    ]);
  });
  function getIndex(arr, prop, value) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i][prop] === value) {
        return i
      }
    }
    return false
  }

  eleventyConfig.addCollection("aboutByYear", function (collectionApi) {
    const posts = collectionApi.getFilteredByGlob(["./about/*.md"]);
    let postsByYear = []
    let currentYear = ""

    posts.forEach(p => {
      let y = new Date(p.data.date).getFullYear()
      if (p.data.draft !== true) {
        if (y !== currentYear) {
          postsByYear.push({
            year: y,
            shortYear: y.toString().substr(2),
            posts: [p]
          })
          currentYear = y;
        } else {
          let index = getIndex(postsByYear, "year", currentYear)
          postsByYear[index].posts.push(p)
        }
      }
    })
    return postsByYear.reverse()
  })


  eleventyConfig.addCollection("postsByYear", function (collectionApi) {
    const posts = collectionApi.getFilteredByGlob(["./posts/*.md"]);
    let postsByYear = []
    let currentYear = ""

    posts.forEach(p => {
      let y = new Date(p.data.date).getFullYear()
      if (p.data.draft !== true) {
        if (y !== currentYear) {
          postsByYear.push({
            year: y,
            shortYear: y.toString().substr(2),
            posts: [p]
          })
          currentYear = y;
        } else {
          let index = getIndex(postsByYear, "year", currentYear)
          postsByYear[index].posts.push(p)
        }
      }
    })
    return postsByYear.reverse()
  })
  eleventyConfig.addCollection("workByYear", function (collectionApi) {
    const work = collectionApi.getFilteredByGlob(["./work/*.md"]);
    let workByYear = []
    let currentYear = ""

    work.forEach(p => {
      let y = new Date(p.data.date).getFullYear()
      if (p.data.draft !== true) {

        if (y !== currentYear) {
          workByYear.push({
            year: y,
            shortYear: y.toString().substr(2),
            posts: [p]
          })
          currentYear = y;
        } else {
          let index = getIndex(workByYear, "year", currentYear)
          workByYear[index].posts.push(p)
        }
      }
    })
    return workByYear.reverse()
  })
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("dist");
  eleventyConfig.addPassthroughCopy("./*.png");
  eleventyConfig.addPassthroughCopy("./*.xml");
  eleventyConfig.addPassthroughCopy("./*.txt");
  eleventyConfig.addPassthroughCopy("_redirects");
  eleventyConfig.addPassthroughCopy("favicon.ico");
  eleventyConfig.addPassthroughCopy("site.webmanifest");
  eleventyConfig.addWatchTarget("./css/");

  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(syntaxHighlight);
  return {};





};
