import { postMessage, receiveMessage, sleep, waitForElm } from "../utils";

type Files = {
  createdAt: number;
  id: number;
  isChecked: boolean;
  name: string;
  resolution: string;
  type: "IMAGE";
  url: string;
}[];

// I used sets because I might have several watch on the same element so I don't want to handle unwatching
let GLOBAL_URLS: Set<string> = new Set([]);

async function watchFilesState(_item: Element) {
  const item = _item as Element & {
    __vue__: {
      selectedFiles: Files;
      $watch: (
        field: "selectedFiles",
        callback: (oldValue: Files, newValue: Files) => void,
        options: Partial<{
          deep: boolean;
          immediate: boolean;
          once: boolean;
        }>
      ) => void;
    };
  };

  // Wait for element to exist before watching it
  await waitForElm(".gallery-item");

  item.__vue__.$watch(
    "selectedFiles",
    function (newValue, oldValue) {
      const oldValuesIds = oldValue.map((val) => val.id);
      const newValuesIds = newValue.map((val) => val.id);
      const newAddedValue = newValue.filter(
        (val) => !oldValuesIds.includes(val.id)
      );
      const newRemovedValue = oldValue.filter(
        (val) => !newValuesIds.includes(val.id)
      );
      // We use this array to have the order correctly
      // Reset required
      if (oldValue.length === 0 || newValue.length === 0) {
        GLOBAL_URLS = new Set([]);
      }
      if (newAddedValue.length) {
        GLOBAL_URLS.add(newAddedValue[0]!.url);
      } else {
        GLOBAL_URLS.delete(newRemovedValue[0]!.url);
      }
      postMessage({
        action: "GALLERY_ITEM_CHANGE",
        payload: { newValues: GLOBAL_URLS },
      });
    },
    { deep: true }
  );
}

function watchGalleryItemChange() {
  const pageContainer = document.querySelector(".page-container");
  if (!pageContainer) {
    console.error("Couldn't find pageContainer!");
    return;
  }
  watchFilesState(pageContainer);
}

function watchTabChange() {
  const tabObserver = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      if (mutation.type !== "attributes" && mutation.attributeName !== "class")
        return;
      postMessage({ action: "GALLERY_TAB_CHANGE", payload: {} });
    }
  });

  tabObserver.observe(document.querySelector("ul.navbar-nav")!, {
    childList: true,
    subtree: true,
    attributes: true,
  });
}

function resetGalleryItem() {
  receiveMessage({
    action: "GALLERY_ITEM_RESET",
    callback() {
      const _pageContainer = document.querySelector(".page-container");
      if (!_pageContainer) {
        console.error("Couldn't find gallery item!");
        return;
      }

      const galleryItem = _pageContainer as Element & {
        __vue__: {
          selectedFiles: [{ isChecked: boolean }];
        };
      };

      galleryItem.__vue__.selectedFiles.forEach((f) => (f.isChecked = false));

      GLOBAL_URLS = new Set([]);
      postMessage({
        action: "GALLERY_ITEM_CHANGE",
        payload: { newValues: [] },
      });
    },
  });
}

(() => {
  watchGalleryItemChange();

  watchTabChange();

  resetGalleryItem();
})();
