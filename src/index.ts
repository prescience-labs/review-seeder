import axios from "axios";

import readline from "readline";
import fs from "fs";
import uuid = require("uuid");

const API_URL = "https://data-intel-reviews-dev.herokuapp.com";

const products: { [key: string]: any } = {};

interface IVendor {
  id: string;
  integrations_type: string;
  integrations_id: string;
  name: string;
}

interface IAmazonData {
  reviewerID: string;
  asin: string;
  reviewerName: string;
  helpful: [number, number];
  reviewText: string;
  overall: number;
  summary: string;
  unixReviewTime: number;
  reviewTime: string;
}
const metaInterface = readline.createInterface({
  input: fs.createReadStream("./product_meta.json")
});
const reviewInterface = readline.createInterface({
  input: fs.createReadStream("./product_review.json")
});
let counter = 0;

async function main() {
  const vendor = await getFirstVendor();
  metaInterface.on("line", handleReadProductMeta);
  reviewInterface.on("line", handleReadReview(vendor.id));
}

function handleReadProductMeta(line: string) {
  try {
    let l = line.replace(/\'/g, '"');
    const parsedProduct = JSON.parse(l);
    products[parsedProduct["asin"]] = parsedProduct;
  } catch (e) {}
}

function handleReadReview(vendor: string) {
  if (counter > 9000) {
    metaInterface.close();
  }
  return function(line: any) {
    try {
      counter++;
      let l = line.replace(/\'/g, '"');

      const parsed: IAmazonData = JSON.parse(line);
      const serialized = ProductReview.serializeFromAmazonData(parsed, vendor);
      axios.post(`${API_URL}/v1/reviews`, serialized).catch(e => {
        console.log(e);
      });
    } catch (e) {}
    return;
  };
}

async function getFirstVendor(): Promise<IVendor> {
  const { data } = await axios.get(`${API_URL}/v1/vendors`);
  const { results } = data;
  if (Array.isArray(results)) {
    return results[0];
  } else {
    throw new RangeError("results is not an array");
  }
}

class ProductReview {
  public text: string = "";
  public rating: number = 0;
  public rating_max: number = 0;
  public analytics_id: string = "";
  public vendor: string = "";

  static serializeFromAmazonData(amazonData: IAmazonData, vendor: string) {
    const p = new ProductReview();
    p.rating = amazonData.overall;
    p.rating_max = 5;
    p.text = amazonData.reviewText;
    p.vendor = vendor;
    p.analytics_id = uuid.v4();
    return p;
  }
}

main();
