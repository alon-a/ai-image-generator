import Head from 'next/head';
import ImageGenerator from '../components/ImageGenerator';

/**
 * Home Page Component - Text to Image Generator
 * @component
 * @description Main page that renders the AI Image Generator application
 * 
 * @example
 * return (
 *   <Home />
 * )
 */
export default function Home() {
  return (
    <>
      <Head>
        <title>AI Image Generator</title>
        <meta name="description" content="Generate images with AI using text descriptions" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <ImageGenerator />
    </>
  );
}